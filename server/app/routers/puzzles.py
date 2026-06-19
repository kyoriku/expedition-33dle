from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Entity
from app.schemas import (
    EntityRead,
    GuessFeedback,
    GuessRequest,
    GuessResponse,
    TodayResponse,
)
from app.services.scheduling import PuzzleNotYetAvailable, get_puzzle_for_date

router = APIRouter(prefix="/api", tags=["puzzles"])


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


def _set_feedback(guess_values, answer_values) -> str:
    """Set comparison shared by multi-value fields (element, affiliation):
    equal sets -> match (covers both-empty), any overlap -> partial, else miss.
    """
    g, a = set(guess_values), set(answer_values)
    if g == a:
        return "match"
    if g & a:
        return "partial"
    return "miss"


def compute_feedback(guess: Entity, answer: Entity) -> GuessFeedback:
    """Compare a guess entity to the answer entity, attribute by attribute.

    Pure function of the two rows — no I/O — so it is unit-testable.
    """
    element = _set_feedback(guess.element, answer.element)

    if guess.act_introduced == answer.act_introduced:
        act = "match"
    else:
        act = "higher" if answer.act_introduced > guess.act_introduced else "lower"

    return GuessFeedback(
        gender="match" if guess.gender == answer.gender else "miss",
        role="match" if guess.role == answer.role else "miss",
        weapon="match" if guess.weapon == answer.weapon else "miss",
        element=element,
        act_introduced=act,
        category="match" if guess.category == answer.category else "miss",
        affiliation=_set_feedback(guess.affiliation, answer.affiliation),
        zone="match" if guess.zone == answer.zone else "miss",
    )


@router.get("/today", response_model=TodayResponse)
async def today(db: AsyncSession = Depends(get_db)) -> TodayResponse:
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

    return TodayResponse(
        puzzle_date=today_date,
        puzzle_number=puzzle_number,
        entities=[EntityRead.model_validate(e) for e in all_entities],
        yesterday=yesterday,
    )


@router.get("/reveal", response_model=EntityRead)
async def reveal(db: AsyncSession = Depends(get_db)) -> EntityRead:
    """Return today's answer entity.

    Intentionally unauthenticated: called by the client to complete the lose
    UX; the theoretical cheating risk is an accepted product decision.
    """
    _, today, _, _ = await _today_puzzle(db)
    return EntityRead.model_validate(today)


@router.post("/guess", response_model=GuessResponse)
async def guess(
    body: GuessRequest, db: AsyncSession = Depends(get_db)
) -> GuessResponse:
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

    return GuessResponse(
        guess=EntityRead.model_validate(guess_entity),
        feedback=compute_feedback(guess_entity, answer_entity),
        is_correct=guess_entity.id == answer_entity.id,
    )
