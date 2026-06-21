from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import PICTOS_MAX_GUESSES
from app.db import get_db
from app.models import Picto
from app.schemas import (
    PictoGuessRequest,
    PictoGuessResponse,
    PictoRead,
    PictoTodayResponse,
    RevealRequest,
)
from app.services.compare import picto_feedback
from app.services.scheduling import PuzzleNotYetAvailable, get_puzzle_for_date

# Salt namespacing the pictos schedule so its daily answer is uncorrelated with
# the classic answer on the same day. Must be passed to EVERY get_puzzle_for_date
# call in this module (today's answer AND the yesterday lookup below).
PICTOS_SALT = "pictos"

router = APIRouter(prefix="/api/pictos", tags=["pictos"])


async def _today_picto(
    db: AsyncSession,
) -> tuple[list[Picto], Picto, int, date]:
    """Load all pictos, compute today's puzzle (UTC), and return the bundle.

    Returns (all_pictos, today_picto, puzzle_number, today_date). The schedule is
    a pure function of the date and roster, salted to "pictos" so it runs
    independently of the classic schedule.
    """
    today_date = datetime.now(timezone.utc).date()
    all_pictos = list(
        (await db.scalars(select(Picto).order_by(Picto.name))).all()
    )
    if not all_pictos:
        raise HTTPException(
            status_code=503,
            detail="Service not ready: no pictos loaded",
        )
    names = tuple(p.name for p in all_pictos)
    try:
        today_name, puzzle_number = get_puzzle_for_date(
            today_date, names, salt=PICTOS_SALT
        )
    except PuzzleNotYetAvailable:
        raise HTTPException(
            status_code=404,
            detail=f"No puzzle available for {today_date.isoformat()}",
        )
    today = next(p for p in all_pictos if p.name == today_name)
    return all_pictos, today, puzzle_number, today_date


@router.get("/today", response_model=PictoTodayResponse)
async def today(db: AsyncSession = Depends(get_db)) -> PictoTodayResponse:
    """Return today's picto puzzle metadata plus the full picto list.

    The answer picto is never singled out in the response. A 404 with a
    structured detail is returned when no puzzle is available for today.
    """
    all_pictos, _, puzzle_number, today_date = await _today_picto(db)

    # Yesterday's answer is over, so it's safe to surface. NOTE: this lookup must
    # also pass salt=PICTOS_SALT — otherwise yesterday resolves against the
    # classic schedule and leaks the wrong name.
    names = tuple(p.name for p in all_pictos)
    yesterday: PictoRead | None = None
    try:
        y_name, _ = get_puzzle_for_date(
            today_date - timedelta(days=1), names, salt=PICTOS_SALT
        )
        y_picto = next(p for p in all_pictos if p.name == y_name)
        yesterday = PictoRead.model_validate(y_picto)
    except PuzzleNotYetAvailable:
        pass  # launch day — there is no previous puzzle

    return PictoTodayResponse(
        puzzle_date=today_date,
        puzzle_number=puzzle_number,
        pictos=[PictoRead.model_validate(p) for p in all_pictos],
        yesterday=yesterday,
    )


@router.post("/reveal", response_model=PictoRead)
async def reveal(
    body: RevealRequest, db: AsyncSession = Depends(get_db)
) -> PictoRead:
    """Return today's answer only once the caller proves the game is over.

    Stateless proof-of-completion mirroring classic: reveal only if today's answer
    is among the submitted guesses (solved) or PICTOS_MAX_GUESSES distinct valid
    guesses were made (lost); 403 otherwise. Bypassable by scripting MAX wrong
    guesses — accepted — but no longer a single unauthenticated GET.
    """
    all_pictos, answer, _, _ = await _today_picto(db)
    roster_ids = {p.id for p in all_pictos}
    valid = {gid for gid in body.guess_ids if gid in roster_ids}
    if answer.id not in valid and len(valid) < PICTOS_MAX_GUESSES:
        raise HTTPException(status_code=403, detail="Puzzle not yet completed")
    return PictoRead.model_validate(answer)


@router.post("/guess", response_model=PictoGuessResponse)
async def guess(
    body: PictoGuessRequest, db: AsyncSession = Depends(get_db)
) -> PictoGuessResponse:
    """Score a picto guess against today's answer without revealing the answer."""
    all_pictos, answer_picto, _, _ = await _today_picto(db)

    guess_picto = next(
        (p for p in all_pictos if p.id == body.picto_id), None
    )
    if guess_picto is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown picto_id {body.picto_id}",
        )

    return PictoGuessResponse(
        guess=PictoRead.model_validate(guess_picto),
        feedback=picto_feedback(guess_picto, answer_picto),
        is_correct=guess_picto.id == answer_picto.id,
    )
