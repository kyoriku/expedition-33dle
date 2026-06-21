from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import WEAPONS_MAX_GUESSES
from app.db import get_db
from app.models import Weapon
from app.schemas import (
    RevealRequest,
    WeaponGuessRequest,
    WeaponGuessResponse,
    WeaponRead,
    WeaponTodayResponse,
)
from app.services.compare import weapon_feedback
from app.services.scheduling import PuzzleNotYetAvailable, get_puzzle_for_date

# Salt namespacing the weapons schedule so its daily answer is uncorrelated with
# the classic/pictos answers on the same day. Must be passed to EVERY
# get_puzzle_for_date call in this module (today's answer AND the yesterday lookup).
WEAPONS_SALT = "weapons"

router = APIRouter(prefix="/api/weapons", tags=["weapons"])


async def _today_weapon(
    db: AsyncSession,
) -> tuple[list[Weapon], Weapon, int, date]:
    """Load all weapons, compute today's puzzle (UTC), and return the bundle.

    Returns (all_weapons, today_weapon, puzzle_number, today_date). The schedule is
    a pure function of the date and roster, salted to "weapons" so it runs
    independently of the classic and pictos schedules.
    """
    today_date = datetime.now(timezone.utc).date()
    all_weapons = list(
        (await db.scalars(select(Weapon).order_by(Weapon.name))).all()
    )
    if not all_weapons:
        raise HTTPException(
            status_code=503,
            detail="Service not ready: no weapons loaded",
        )
    names = tuple(w.name for w in all_weapons)
    try:
        today_name, puzzle_number = get_puzzle_for_date(
            today_date, names, salt=WEAPONS_SALT
        )
    except PuzzleNotYetAvailable:
        raise HTTPException(
            status_code=404,
            detail=f"No puzzle available for {today_date.isoformat()}",
        )
    today = next(w for w in all_weapons if w.name == today_name)
    return all_weapons, today, puzzle_number, today_date


@router.get("/today", response_model=WeaponTodayResponse)
async def today(db: AsyncSession = Depends(get_db)) -> WeaponTodayResponse:
    """Return today's weapon puzzle metadata plus the full weapon list.

    The answer weapon is never singled out in the response. A 404 with a
    structured detail is returned when no puzzle is available for today.
    """
    all_weapons, _, puzzle_number, today_date = await _today_weapon(db)

    # Yesterday's answer is over, so it's safe to surface. NOTE: this lookup must
    # also pass salt=WEAPONS_SALT — otherwise yesterday resolves against the
    # classic schedule and leaks the wrong name.
    names = tuple(w.name for w in all_weapons)
    yesterday: WeaponRead | None = None
    try:
        y_name, _ = get_puzzle_for_date(
            today_date - timedelta(days=1), names, salt=WEAPONS_SALT
        )
        y_weapon = next(w for w in all_weapons if w.name == y_name)
        yesterday = WeaponRead.model_validate(y_weapon)
    except PuzzleNotYetAvailable:
        pass  # launch day — there is no previous puzzle

    return WeaponTodayResponse(
        puzzle_date=today_date,
        puzzle_number=puzzle_number,
        weapons=[WeaponRead.model_validate(w) for w in all_weapons],
        yesterday=yesterday,
    )


@router.post("/reveal", response_model=WeaponRead)
async def reveal(
    body: RevealRequest, db: AsyncSession = Depends(get_db)
) -> WeaponRead:
    """Return today's answer only once the caller proves the game is over.

    Stateless proof-of-completion mirroring classic/pictos: reveal only if today's
    answer is among the submitted guesses (solved) or WEAPONS_MAX_GUESSES distinct
    valid guesses were made (lost); 403 otherwise. Bypassable by scripting MAX wrong
    guesses — accepted — but no longer a single unauthenticated GET.
    """
    all_weapons, answer, _, _ = await _today_weapon(db)
    roster_ids = {w.id for w in all_weapons}
    valid = {gid for gid in body.guess_ids if gid in roster_ids}
    if answer.id not in valid and len(valid) < WEAPONS_MAX_GUESSES:
        raise HTTPException(status_code=403, detail="Puzzle not yet completed")
    return WeaponRead.model_validate(answer)


@router.post("/guess", response_model=WeaponGuessResponse)
async def guess(
    body: WeaponGuessRequest, db: AsyncSession = Depends(get_db)
) -> WeaponGuessResponse:
    """Score a weapon guess against today's answer without revealing the answer."""
    all_weapons, answer_weapon, _, _ = await _today_weapon(db)

    guess_weapon = next(
        (w for w in all_weapons if w.id == body.weapon_id), None
    )
    if guess_weapon is None:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown weapon_id {body.weapon_id}",
        )

    return WeaponGuessResponse(
        guess=WeaponRead.model_validate(guess_weapon),
        feedback=weapon_feedback(guess_weapon, answer_weapon),
        is_correct=guess_weapon.id == answer_weapon.id,
    )
