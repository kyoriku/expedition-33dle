"""Deterministic puzzle scheduling — pure function of (date, roster, seed).

No DB state required. Same inputs always produce the same output. The
no-consecutive-repeats invariant is preserved across cycle boundaries (when
the pool cycles back to position 0, the first entity is swapped with the
second if it would otherwise equal the previous cycle's last entity).
"""

from datetime import date
from functools import lru_cache
import random

from app.constants import LAUNCH_DATE, SHUFFLE_SEED


class PuzzleNotYetAvailable(Exception):
    """Raised when a puzzle is requested for a date before LAUNCH_DATE."""


def get_puzzle_for_date(
    target_date: date,
    entity_names: tuple[str, ...],
) -> tuple[str, int]:
    """Return (entity_name, puzzle_number) for the given date.

    entity_names should be a tuple (hashable) so caching works; order doesn't
    matter as the function sorts internally for determinism.
    """
    days_since_launch = (target_date - LAUNCH_DATE).days
    if days_since_launch < 0:
        raise PuzzleNotYetAvailable()

    puzzle_number = days_since_launch + 1
    pool = tuple(sorted(entity_names))
    pool_size = len(pool)
    if pool_size == 0:
        raise RuntimeError("Cannot compute puzzle with empty entity pool")

    cycle_index = days_since_launch // pool_size
    position = days_since_launch % pool_size
    name = _shuffled_cycle(cycle_index, pool)[position]
    return name, puzzle_number


@lru_cache(maxsize=256)
def _shuffled_cycle(cycle_index: int, pool: tuple[str, ...]) -> tuple[str, ...]:
    """Deterministic shuffle for a given cycle, with no-consecutive-repeats."""
    rng = random.Random(SHUFFLE_SEED + cycle_index)
    shuffled = list(pool)
    rng.shuffle(shuffled)
    if cycle_index > 0 and len(shuffled) > 1:
        prev = _shuffled_cycle(cycle_index - 1, pool)
        if shuffled[0] == prev[-1]:
            shuffled[0], shuffled[1] = shuffled[1], shuffled[0]
    return tuple(shuffled)
