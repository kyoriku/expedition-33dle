"""Deterministic puzzle scheduling — pure function of (date, roster, seed).

No DB state required. Same inputs always produce the same output. The
no-consecutive-repeats invariant is preserved across cycle boundaries (when
the pool cycles back to position 0, the first name is swapped with the
second if it would otherwise equal the previous cycle's last name).

Mode-agnostic: the roster is just a tuple of names, so every mode (classic,
pictos, …) schedules through here, differentiated only by `salt`.
"""

from datetime import date
from functools import lru_cache
import hashlib
import random

from app.constants import LAUNCH_DATE, SHUFFLE_SEED


class PuzzleNotYetAvailable(Exception):
    """Raised when a puzzle is requested for a date before LAUNCH_DATE."""


def _salt_offset(salt: str) -> int:
    """Deterministic per-salt seed offset.

    An empty salt is a no-op (offset 0), so the classic schedule stays
    byte-identical to its pre-pictos behavior. A non-empty salt (e.g. "pictos")
    shifts the RNG seed so a second mode's schedule is independent of classic's
    by construction — independent of pool size, not as an accident of it.
    """
    if not salt:
        return 0
    return int.from_bytes(hashlib.blake2b(salt.encode(), digest_size=8).digest(), "big")


def get_puzzle_for_date(
    target_date: date,
    names: tuple[str, ...],
    salt: str = "",
) -> tuple[str, int]:
    """Return (name, puzzle_number) for the given date.

    `names` should be a tuple (hashable) so caching works; order doesn't
    matter as the function sorts internally for determinism. `salt` namespaces
    the schedule so parallel modes (classic vs pictos) pick uncorrelated answers
    on the same day; the default "" preserves the original classic schedule.
    """
    days_since_launch = (target_date - LAUNCH_DATE).days
    if days_since_launch < 0:
        raise PuzzleNotYetAvailable()

    puzzle_number = days_since_launch + 1
    pool = tuple(sorted(names))
    pool_size = len(pool)
    if pool_size == 0:
        raise RuntimeError("Cannot compute puzzle with an empty roster")

    cycle_index = days_since_launch // pool_size
    position = days_since_launch % pool_size
    name = _shuffled_cycle(cycle_index, pool, salt)[position]
    return name, puzzle_number


@lru_cache(maxsize=256)
def _shuffled_cycle(
    cycle_index: int, pool: tuple[str, ...], salt: str = ""
) -> tuple[str, ...]:
    """Deterministic shuffle for a given cycle, with no-consecutive-repeats."""
    rng = random.Random(SHUFFLE_SEED + cycle_index + _salt_offset(salt))
    shuffled = list(pool)
    rng.shuffle(shuffled)
    if cycle_index > 0 and len(shuffled) > 1:
        prev = _shuffled_cycle(cycle_index - 1, pool, salt)
        if shuffled[0] == prev[-1]:
            shuffled[0], shuffled[1] = shuffled[1], shuffled[0]
    return tuple(shuffled)
