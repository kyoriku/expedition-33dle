from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import CLASSIC_MAX_GUESSES
from app.db import get_db
from app.models import Character
from app.schemas import (
    CharacterRead,
    ClassicGuessRequest,
    ClassicGuessResponse,
    ClassicTodayResponse,
    RevealRequest,
)
from app.services.compare import classic_feedback
from app.services.scheduling import PuzzleNotYetAvailable, get_puzzle_for_date

# Salt namespacing the classic schedule so its daily answer is independent of the
# other modes on the same day — and so a future mode that forgets its own salt
# can't collide with classic by default. Must be passed to EVERY
# get_puzzle_for_date call in this module (today's answer AND the yesterday lookup
# below). Mirrors PICTOS_SALT / WEAPONS_SALT in their routers.
CLASSIC_SALT = "classic"

router = APIRouter(prefix="/api/classic", tags=["classic"])


async def _today_character(
    db: AsyncSession,
) -> tuple[list[Character], Character, int, date]:
    """Load all characters, compute today's puzzle (UTC), and return the bundle.

    Returns (all_characters, today_character, puzzle_number, today_date). The
    schedule is a pure function of the date and roster — no puzzles table is
    consulted.
    """
    today_date = datetime.now(timezone.utc).date()
    all_characters = list(
        (await db.scalars(select(Character).order_by(Character.name))).all()
    )
    if not all_characters:
        raise HTTPException(
            status_code=503,
            detail="Service not ready: no characters loaded",
        )
    names = tuple(c.name for c in all_characters)
    try:
        today_name, puzzle_number = get_puzzle_for_date(
            today_date, names, salt=CLASSIC_SALT
        )
    except PuzzleNotYetAvailable:
        raise HTTPException(
            status_code=404,
            detail=f"No puzzle available for {today_date.isoformat()}",
        )
    today = next(c for c in all_characters if c.name == today_name)
    return all_characters, today, puzzle_number, today_date


@router.get("/today", response_model=ClassicTodayResponse)
async def today(db: AsyncSession = Depends(get_db)) -> ClassicTodayResponse:
    """Return today's puzzle metadata plus the full character list.

    The answer character is never singled out in the response. A 404 with a
    structured detail is returned when no puzzle is available for today.
    """
    all_characters, _, puzzle_number, today_date = await _today_character(db)

    # Yesterday's answer is over, so it's safe to surface (nice daily-game touch).
    # NOTE: this lookup must also pass salt=CLASSIC_SALT — otherwise yesterday
    # resolves against the unsalted schedule and leaks the wrong name.
    names = tuple(c.name for c in all_characters)
    yesterday: CharacterRead | None = None
    try:
        y_name, _ = get_puzzle_for_date(
            today_date - timedelta(days=1), names, salt=CLASSIC_SALT
        )
        y_character = next(c for c in all_characters if c.name == y_name)
        yesterday = CharacterRead.model_validate(y_character)
    except PuzzleNotYetAvailable:
        pass  # launch day — there is no previous puzzle

    return ClassicTodayResponse(
        puzzle_date=today_date,
        puzzle_number=puzzle_number,
        characters=[CharacterRead.model_validate(c) for c in all_characters],
        yesterday=yesterday,
    )


@router.post("/reveal", response_model=CharacterRead)
async def reveal(
    body: RevealRequest, db: AsyncSession = Depends(get_db)
) -> CharacterRead:
    """Return today's answer only once the caller proves the game is over.

    Stateless proof-of-completion: the client submits the ids it has guessed; we
    reveal only if today's answer is among them (solved) or it made
    CLASSIC_MAX_GUESSES distinct valid guesses (lost). 403 otherwise. Still
    bypassable by scripting MAX wrong guesses — an accepted genre risk — but the
    answer is no longer one unauthenticated GET away.
    """
    all_characters, answer, _, _ = await _today_character(db)
    roster_ids = {c.id for c in all_characters}
    valid = {gid for gid in body.guess_ids if gid in roster_ids}
    if answer.id not in valid and len(valid) < CLASSIC_MAX_GUESSES:
        raise HTTPException(status_code=403, detail="Puzzle not yet completed")
    return CharacterRead.model_validate(answer)


@router.post("/guess", response_model=ClassicGuessResponse)
async def guess(
    body: ClassicGuessRequest, db: AsyncSession = Depends(get_db)
) -> ClassicGuessResponse:
    """Score a guess against today's answer without revealing the answer."""
    all_characters, answer_character, _, _ = await _today_character(db)

    guess_character = next(
        (c for c in all_characters if c.id == body.character_id), None
    )
    if guess_character is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown character_id {body.character_id}",
        )

    return ClassicGuessResponse(
        guess=CharacterRead.model_validate(guess_character),
        feedback=classic_feedback(guess_character, answer_character),
        is_correct=guess_character.id == answer_character.id,
    )
