from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Entity, Puzzle
from app.schemas import (
    EntityRead,
    GuessFeedback,
    GuessRequest,
    GuessResponse,
    TodayResponse,
)

router = APIRouter(prefix="/api", tags=["puzzles"])


async def _today_puzzle(db: AsyncSession) -> Puzzle:
    """Fetch today's puzzle (UTC) or raise the standard structured 404."""
    today_date = datetime.now(timezone.utc).date()
    puzzle = await db.scalar(
        select(Puzzle).where(Puzzle.puzzle_date == today_date)
    )
    if puzzle is None:
        raise HTTPException(
            status_code=404,
            detail=f"No puzzle scheduled for {today_date.isoformat()}",
        )
    return puzzle


def compute_feedback(guess: Entity, answer: Entity) -> GuessFeedback:
    """Compare a guess entity to the answer entity, attribute by attribute.

    Pure function of the two rows — no I/O — so it is unit-testable.
    """
    if guess.age == answer.age:  # covers both-null
        age = "match"
    elif guess.age is None or answer.age is None:
        age = "unknown"
    else:
        age = "higher" if answer.age > guess.age else "lower"

    guess_el, answer_el = set(guess.element), set(answer.element)
    if guess_el == answer_el:  # covers both-empty
        element = "match"
    elif guess_el & answer_el:
        element = "partial"
    else:
        element = "miss"

    if guess.act_introduced == answer.act_introduced:
        act = "match"
    else:
        act = "higher" if answer.act_introduced > guess.act_introduced else "lower"

    return GuessFeedback(
        gender="match" if guess.gender == answer.gender else "miss",
        age=age,
        class_role="match" if guess.class_role == answer.class_role else "miss",
        weapon="match" if guess.weapon == answer.weapon else "miss",
        element=element,
        act_introduced=act,
    )


@router.get("/today", response_model=TodayResponse)
async def today(db: AsyncSession = Depends(get_db)) -> TodayResponse:
    """Return today's puzzle metadata plus the full entity list.

    The answer entity is never singled out in the response. A 404 with a
    structured detail is returned when no puzzle is scheduled for today.
    """
    puzzle = await _today_puzzle(db)

    entities = (await db.scalars(select(Entity).order_by(Entity.name))).all()

    return TodayResponse(
        puzzle_date=puzzle.puzzle_date,
        puzzle_number=puzzle.puzzle_number,
        entities=[EntityRead.model_validate(e) for e in entities],
    )


@router.get("/reveal", response_model=EntityRead)
async def reveal(db: AsyncSession = Depends(get_db)) -> EntityRead:
    """Return today's answer entity.

    Intentionally unauthenticated: called by the client to complete the lose
    UX; the theoretical cheating risk is an accepted product decision.
    """
    puzzle = await _today_puzzle(db)
    entity = await db.get(Entity, puzzle.entity_id)
    return EntityRead.model_validate(entity)


@router.post("/guess", response_model=GuessResponse)
async def guess(
    body: GuessRequest, db: AsyncSession = Depends(get_db)
) -> GuessResponse:
    """Score a guess against today's answer without revealing the answer."""
    puzzle = await _today_puzzle(db)

    guess_entity = await db.get(Entity, body.entity_id)
    if guess_entity is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown entity_id {body.entity_id}",
        )

    answer_entity = await db.get(Entity, puzzle.entity_id)

    return GuessResponse(
        guess=EntityRead.model_validate(guess_entity),
        feedback=compute_feedback(guess_entity, answer_entity),
        is_correct=guess_entity.id == answer_entity.id,
    )
