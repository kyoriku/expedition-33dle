"""The scheduling fingerprint guard: frozen inputs stay frozen.

Pure-function tests, no DB, no HTTP client (conftest's dummy DATABASE_URL
satisfies the router imports the guard pulls in). The autouse fixture clears
the scheduler's lru_cache before AND after every test: _shuffled_cycle's
cache key is (cycle_index, pool, salt) — it does NOT include SHUFFLE_SEED —
so the seed-sensitivity test would otherwise read stale entries, and entries
computed under a patched seed would poison later tests. Monkeypatch unwinds
before the fixture's post-clear, so no patched-seed entry survives.
"""

import inspect
from datetime import timedelta

import pytest

import app.services.scheduling as scheduling
import app.services.scheduling_guard as guard


@pytest.fixture(autouse=True)
def _fresh_cycle_cache():
    scheduling._shuffled_cycle.cache_clear()
    yield
    scheduling._shuffled_cycle.cache_clear()


def test_fingerprint_matches_expected_constant():
    """The pin: current code must reproduce the frozen digest."""
    assert (
        guard.compute_scheduling_fingerprint()
        == guard.EXPECTED_SCHEDULING_FINGERPRINT
    )


def test_assert_passes_on_match():
    guard.assert_scheduling_fingerprint()  # must not raise


def test_fingerprint_stable_across_recomputation():
    first = guard.compute_scheduling_fingerprint()
    second = guard.compute_scheduling_fingerprint()
    scheduling._shuffled_cycle.cache_clear()
    third = guard.compute_scheduling_fingerprint()
    assert first == second == third


def test_mismatch_raises_with_actionable_message(monkeypatch):
    monkeypatch.setattr(guard, "EXPECTED_SCHEDULING_FINGERPRINT", "0" * 32)
    with pytest.raises(RuntimeError) as exc:
        guard.assert_scheduling_fingerprint()
    msg = str(exc.value)
    assert "0" * 32 in msg  # the expected digest
    assert guard.compute_scheduling_fingerprint() in msg  # the computed digest
    assert "reshuffle" in msg.lower()
    assert "EXPECTED_SCHEDULING_FINGERPRINT" in msg  # the remedy


def test_shuffle_seed_change_changes_fingerprint(monkeypatch):
    baseline = guard.compute_scheduling_fingerprint()
    monkeypatch.setattr(scheduling, "SHUFFLE_SEED", scheduling.SHUFFLE_SEED + 1)
    scheduling._shuffled_cycle.cache_clear()  # cache key omits the seed
    assert guard.compute_scheduling_fingerprint() != baseline


def test_launch_date_change_changes_fingerprint(monkeypatch):
    baseline = guard.compute_scheduling_fingerprint()
    # LATER date on purpose: an earlier one raises PuzzleNotYetAvailable on
    # golden day 0 instead of producing a differing digest.
    monkeypatch.setattr(guard, "LAUNCH_DATE", guard.LAUNCH_DATE + timedelta(days=1))
    assert guard.compute_scheduling_fingerprint() != baseline


def test_salt_change_changes_fingerprint(monkeypatch):
    baseline = guard.compute_scheduling_fingerprint()
    monkeypatch.setitem(guard.MODE_SALTS, "classic", "classic-v2")
    assert guard.compute_scheduling_fingerprint() != baseline


def test_guard_is_wired_into_main_at_import_time():
    # app.main imported inside the test per the repo convention (a broken
    # import fails a named test, not collection). Source check because a
    # successful import proves only that the guard passed, not that it ran.
    import app.main

    assert "assert_scheduling_fingerprint()" in inspect.getsource(app.main)
