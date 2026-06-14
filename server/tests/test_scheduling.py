"""Unit tests for the deterministic puzzle scheduler.

Pure-function tests: no database, no async. The real 41-name roster is loaded
from data/characters.json so the tests exercise production inputs, plus a small
synthetic pool for fast boundary checks.
"""

import json
from datetime import timedelta
from pathlib import Path

import pytest

from app.constants import LAUNCH_DATE
from app.services.scheduling import (
    PuzzleNotYetAvailable,
    get_puzzle_for_date,
)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _roster() -> tuple[str, ...]:
    with open(DATA_DIR / "characters.json", encoding="utf-8") as f:
        return tuple(e["name"] for e in json.load(f))


ROSTER = _roster()
SMALL_POOL = ("Alpha", "Bravo", "Charlie", "Delta", "Echo")


def test_roster_loaded():
    """Sanity: the real roster has the expected size and is non-trivial."""
    assert len(ROSTER) == 41
    assert len(set(ROSTER)) == len(ROSTER)  # unique names


def test_determinism():
    """Same (date, roster) returns the same answer on repeated calls."""
    target = LAUNCH_DATE + timedelta(days=123)
    first = get_puzzle_for_date(target, ROSTER)
    second = get_puzzle_for_date(target, ROSTER)
    assert first == second


def test_order_independent():
    """Result does not depend on the input ordering (function sorts internally)."""
    target = LAUNCH_DATE + timedelta(days=7)
    forward = get_puzzle_for_date(target, ROSTER)
    reversed_in = get_puzzle_for_date(target, tuple(reversed(ROSTER)))
    assert forward == reversed_in


def test_pre_launch_raises():
    """A date before LAUNCH_DATE has no puzzle."""
    with pytest.raises(PuzzleNotYetAvailable):
        get_puzzle_for_date(LAUNCH_DATE - timedelta(days=1), ROSTER)


def test_launch_day_is_number_one():
    name, number = get_puzzle_for_date(LAUNCH_DATE, ROSTER)
    assert number == 1
    assert name in ROSTER


def test_puzzle_number_progression():
    _, number = get_puzzle_for_date(LAUNCH_DATE + timedelta(days=46), ROSTER)
    assert number == 47


def test_no_consecutive_repeats_over_200_days():
    """No two adjacent days resolve to the same entity, across cycle boundaries."""
    previous = None
    for i in range(200):
        name, _ = get_puzzle_for_date(LAUNCH_DATE + timedelta(days=i), ROSTER)
        assert name != previous, f"day {i} repeated {name!r}"
        previous = name


def test_cycle_boundaries():
    """The boundary swap prevents repeats where a cycle wraps to position 0."""
    pool_size = len(ROSTER)
    # Check the first five cycle boundaries explicitly.
    for cycle in range(1, 6):
        last_of_prev = get_puzzle_for_date(
            LAUNCH_DATE + timedelta(days=cycle * pool_size - 1), ROSTER
        )[0]
        first_of_next = get_puzzle_for_date(
            LAUNCH_DATE + timedelta(days=cycle * pool_size), ROSTER
        )[0]
        second_of_next = get_puzzle_for_date(
            LAUNCH_DATE + timedelta(days=cycle * pool_size + 1), ROSTER
        )[0]
        assert last_of_prev != first_of_next, f"boundary repeat at cycle {cycle}"
        assert first_of_next != second_of_next, f"repeat after boundary, cycle {cycle}"


def test_each_cycle_is_a_full_permutation():
    """Within any single cycle every entity appears exactly once."""
    pool_size = len(ROSTER)
    for cycle in range(3):
        names = [
            get_puzzle_for_date(
                LAUNCH_DATE + timedelta(days=cycle * pool_size + pos), ROSTER
            )[0]
            for pos in range(pool_size)
        ]
        assert sorted(names) == sorted(ROSTER)


def test_small_pool_no_consecutive_repeats():
    """The invariant also holds for a tiny pool over many cycles."""
    previous = None
    for i in range(100):
        name, _ = get_puzzle_for_date(LAUNCH_DATE + timedelta(days=i), SMALL_POOL)
        assert name != previous
        previous = name


def test_far_future():
    """A date far in the future resolves without error."""
    name, number = get_puzzle_for_date(
        LAUNCH_DATE + timedelta(days=10000), ROSTER
    )
    assert name in ROSTER
    assert number == 10001


def test_empty_pool_raises_runtime_error():
    """An empty pool on a valid (post-launch) date is a programming error."""
    with pytest.raises(RuntimeError):
        get_puzzle_for_date(LAUNCH_DATE, ())


def test_empty_pool_pre_launch_still_not_available():
    """Pre-launch check fires before the empty-pool check."""
    with pytest.raises(PuzzleNotYetAvailable):
        get_puzzle_for_date(LAUNCH_DATE - timedelta(days=1), ())
