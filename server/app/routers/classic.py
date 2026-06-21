from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import CLASSIC_MAX_GUESSES
from app.db import get_db
from app.models import Entity
from app.schemas import (
    ClassicGuessRequest,
    ClassicGuessResponse,
    ClassicTodayResponse,
    EntityRead,
    RevealRequest,
)
from app.services.compare import classic_feedback
from app.services.scheduling import PuzzleNotYetAvailable, get_puzzle_for_date

router = APIRouter(prefix="/api/classic", tags=["classic"])


async def _today_puzzle(
    db: AsyncSession,
) -> tuple[list[Entity], Entity, int, date]:
    """Load all entities, compute today's puzzle (UTC), and return the bundle.

    Returns (all_entities, today_entity, puzzle_number, today_date). The schedule
    is a pure function of the date and roster — no puzzles table is consulted.
    """
    today_date = datetime.now(timezone.utc).date()
    all_entities = list(
        (await db.scalars(select(Entity).order_by(Entity.name))).all()
    )
    if not all_entities:
        raise HTTPException(
            status_code=503,
            detail="Service not ready: no entities loaded",
        )
    names = tuple(e.name for e in all_entities)
    try:
        today_name, puzzle_number = get_puzzle_for_date(today_date, names)
    except PuzzleNotYetAvailable:
        raise HTTPException(
            status_code=404,
            detail=f"No puzzle available for {today_date.isoformat()}",
        )
    today = next(e for e in all_entities if e.name == today_name)
    return all_entities, today, puzzle_number, today_date


@router.get("/today", response_model=ClassicTodayResponse)
async def today(db: AsyncSession = Depends(get_db)) -> ClassicTodayResponse:
    """Return today's puzzle metadata plus the full entity list.

    The answer entity is never singled out in the response. A 404 with a
    structured detail is returned when no puzzle is available for today.
    """
    all_entities, _, puzzle_number, today_date = await _today_puzzle(db)

    # Yesterday's answer is over, so it's safe to surface (nice daily-game touch).
    names = tuple(e.name for e in all_entities)
    yesterday: EntityRead | None = None
    try:
        y_name, _ = get_puzzle_for_date(today_date - timedelta(days=1), names)
        y_entity = next(e for e in all_entities if e.name == y_name)
        yesterday = EntityRead.model_validate(y_entity)
    except PuzzleNotYetAvailable:
        pass  # launch day — there is no previous puzzle

    return ClassicTodayResponse(
        puzzle_date=today_date,
        puzzle_number=puzzle_number,
        entities=[EntityRead.model_validate(e) for e in all_entities],
        yesterday=yesterday,
    )


@router.post("/reveal", response_model=EntityRead)
async def reveal(
    body: RevealRequest, db: AsyncSession = Depends(get_db)
) -> EntityRead:
    """Return today's answer only once the caller proves the game is over.

    Stateless proof-of-completion: the client submits the ids it has guessed; we
    reveal only if today's answer is among them (solved) or it made
    CLASSIC_MAX_GUESSES distinct valid guesses (lost). 403 otherwise. Still
    bypassable by scripting MAX wrong guesses — an accepted genre risk — but the
    answer is no longer one unauthenticated GET away.
    """
    all_entities, answer, _, _ = await _today_puzzle(db)
    roster_ids = {e.id for e in all_entities}
    valid = {gid for gid in body.guess_ids if gid in roster_ids}
    if answer.id not in valid and len(valid) < CLASSIC_MAX_GUESSES:
        raise HTTPException(status_code=403, detail="Puzzle not yet completed")
    return EntityRead.model_validate(answer)


@router.post("/guess", response_model=ClassicGuessResponse)
async def guess(
    body: ClassicGuessRequest, db: AsyncSession = Depends(get_db)
) -> ClassicGuessResponse:
    """Score a guess against today's answer without revealing the answer."""
    all_entities, answer_entity, _, _ = await _today_puzzle(db)

    guess_entity = next(
        (e for e in all_entities if e.id == body.entity_id), None
    )
    if guess_entity is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown entity_id {body.entity_id}",
        )

    return ClassicGuessResponse(
        guess=EntityRead.model_validate(guess_entity),
        feedback=classic_feedback(guess_entity, answer_entity),
        is_correct=guess_entity.id == answer_entity.id,
    )
