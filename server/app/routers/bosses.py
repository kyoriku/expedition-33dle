from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import BOSSES_MAX_GUESSES
from app.db import get_db
from app.models import Boss
from app.schemas import (
    BossGuessRequest,
    BossGuessResponse,
    BossRead,
    BossTodayResponse,
    RevealRequest,
)
from app.services.compare import boss_feedback
from app.services.scheduling import PuzzleNotYetAvailable, get_puzzle_for_date

# Salt namespacing the bosses schedule so its daily answer is uncorrelated with
# the classic/pictos/weapons answers on the same day. Must be passed to EVERY
# get_puzzle_for_date call in this module (today's answer AND the yesterday lookup).
BOSSES_SALT = "bosses"

router = APIRouter(prefix="/api/bosses", tags=["bosses"])


async def _today_boss(
    db: AsyncSession,
) -> tuple[list[Boss], Boss, int, date]:
    """Load all bosses, compute today's puzzle (UTC), and return the bundle.

    Returns (all_bosses, today_boss, puzzle_number, today_date). The schedule is
    a pure function of the date and roster, salted to "bosses" so it runs
    independently of the classic, pictos, and weapons schedules.
    """
    today_date = datetime.now(timezone.utc).date()
    all_bosses = list(
        (await db.scalars(select(Boss).order_by(Boss.name))).all()
    )
    if not all_bosses:
        raise HTTPException(
            status_code=503,
            detail="Service not ready: no bosses loaded",
        )
    names = tuple(b.name for b in all_bosses)
    try:
        today_name, puzzle_number = get_puzzle_for_date(
            today_date, names, salt=BOSSES_SALT
        )
    except PuzzleNotYetAvailable:
        raise HTTPException(
            status_code=404,
            detail=f"No puzzle available for {today_date.isoformat()}",
        )
    today = next(b for b in all_bosses if b.name == today_name)
    return all_bosses, today, puzzle_number, today_date


@router.get("/today", response_model=BossTodayResponse)
async def today(db: AsyncSession = Depends(get_db)) -> BossTodayResponse:
    """Return today's boss puzzle metadata plus the full boss list.

    The answer boss is never singled out in the response. A 404 with a
    structured detail is returned when no puzzle is available for today.
    """
    all_bosses, _, puzzle_number, today_date = await _today_boss(db)

    # Yesterday's answer is over, so it's safe to surface. NOTE: this lookup must
    # also pass salt=BOSSES_SALT — otherwise yesterday resolves against the
    # classic schedule and leaks the wrong name.
    names = tuple(b.name for b in all_bosses)
    yesterday: BossRead | None = None
    try:
        y_name, _ = get_puzzle_for_date(
            today_date - timedelta(days=1), names, salt=BOSSES_SALT
        )
        y_boss = next(b for b in all_bosses if b.name == y_name)
        yesterday = BossRead.model_validate(y_boss)
    except PuzzleNotYetAvailable:
        pass  # launch day — there is no previous puzzle

    return BossTodayResponse(
        puzzle_date=today_date,
        puzzle_number=puzzle_number,
        bosses=[BossRead.model_validate(b) for b in all_bosses],
        yesterday=yesterday,
    )


@router.post("/reveal", response_model=BossRead)
async def reveal(
    body: RevealRequest, db: AsyncSession = Depends(get_db)
) -> BossRead:
    """Return today's answer only once the caller proves the game is over.

    Stateless proof-of-completion mirroring classic/pictos/weapons: reveal only if
    today's answer is among the submitted guesses (solved) or BOSSES_MAX_GUESSES
    distinct valid guesses were made (lost); 403 otherwise. Bypassable by scripting
    MAX wrong guesses — accepted — but no longer a single unauthenticated GET.
    """
    all_bosses, answer, _, _ = await _today_boss(db)
    roster_ids = {b.id for b in all_bosses}
    valid = {gid for gid in body.guess_ids if gid in roster_ids}
    if answer.id not in valid and len(valid) < BOSSES_MAX_GUESSES:
        raise HTTPException(status_code=403, detail="Puzzle not yet completed")
    return BossRead.model_validate(answer)


@router.post("/guess", response_model=BossGuessResponse)
async def guess(
    body: BossGuessRequest, db: AsyncSession = Depends(get_db)
) -> BossGuessResponse:
    """Score a boss guess against today's answer without revealing the answer."""
    all_bosses, answer_boss, _, _ = await _today_boss(db)

    guess_boss = next(
        (b for b in all_bosses if b.id == body.boss_id), None
    )
    if guess_boss is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown boss_id {body.boss_id}",
        )

    return BossGuessResponse(
        guess=BossRead.model_validate(guess_boss),
        feedback=boss_feedback(guess_boss, answer_boss),
        is_correct=guess_boss.id == answer_boss.id,
    )
