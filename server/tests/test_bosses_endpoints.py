"""Handler-level tests for the bosses endpoints.

The route handlers are awaited directly with a fake session (via asyncio.run),
so these exercise the real wiring — schedule lookup (salted to "bosses"), answer
selection, scoring, error paths — without a database or an HTTP client. Mirrors
test_weapons_endpoints.py.
"""

import asyncio
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from app.constants import BOSSES_MAX_GUESSES, LAUNCH_DATE
from app.models import Boss
from app.routers.bosses import guess, reveal, today
from app.schemas import BossGuessRequest, BossRead, RevealRequest
from app.services.compare import boss_feedback
from app.services.scheduling import get_puzzle_for_date


def _boss(id_: int, name: str, **kw) -> Boss:
    base = dict(
        weakness=["Fire"],
        resistance=["Ice"],
        category="Nevron",
        location="Flying Waters",
        encounter="Required",
        act_introduced=2,
    )
    return Boss(id=id_, name=name, **{**base, **kw})


ROSTER = [
    _boss(1, "Alicia", weakness=[], resistance=["Light"], category="Painted Human",
          location="The Reacher", encounter="Optional", act_introduced=3),
    _boss(2, "Goblu", weakness=["Lightning"], resistance=["Ice"], act_introduced=1),
    _boss(3, "Dualliste", weakness=["Light"], resistance=["Fire", "Dark"],
          location="Forgotten Battlefield"),
    _boss(4, "Clea", weakness=["Void", "Light"], resistance=["Physical"],
          category="Painted Human", location="Flying Manor", encounter="Optional",
          act_introduced=3),
]


class _Scalars:
    def __init__(self, items):
        self._items = items

    def all(self):
        return list(self._items)


class FakeSession:
    """Minimal stand-in for AsyncSession — only `scalars().all()` is used."""

    def __init__(self, bosses):
        self._bosses = bosses

    async def scalars(self, *args, **kwargs):
        return _Scalars(self._bosses)


def run(coro):
    return asyncio.run(coro)


def _todays_answer(bosses) -> Boss:
    names = tuple(b.name for b in bosses)
    name, _ = get_puzzle_for_date(
        datetime.now(timezone.utc).date(), names, salt="bosses"
    )
    return next(b for b in bosses if b.name == name)


def test_today_lists_all_bosses_and_hides_answer():
    resp = run(today(db=FakeSession(ROSTER)))
    assert len(resp.bosses) == len(ROSTER)
    assert resp.puzzle_number >= 1
    # The schema structurally cannot leak the answer.
    assert "answer" not in resp.model_dump()


def _freeze_today(monkeypatch, target):
    """Pin the router's UTC 'today' so date-relative behavior is deterministic
    (the yesterday lookup flips at LAUNCH_DATE, and wall-clock tests would
    change meaning as real days pass)."""

    class _Frozen:
        @staticmethod
        def now(tz=None):
            return datetime(target.year, target.month, target.day, 12, tzinfo=tz)

    monkeypatch.setattr("app.routers.bosses.datetime", _Frozen)


def test_today_includes_yesterday(monkeypatch):
    _freeze_today(monkeypatch, LAUNCH_DATE + timedelta(days=32))
    resp = run(today(db=FakeSession(ROSTER)))
    assert resp.yesterday is not None
    assert resp.yesterday.name in {b.name for b in ROSTER}


def test_today_launch_day_has_no_yesterday(monkeypatch):
    # Puzzle #1 has no predecessor by design (PuzzleNotYetAvailable -> None).
    _freeze_today(monkeypatch, LAUNCH_DATE)
    resp = run(today(db=FakeSession(ROSTER)))
    assert resp.yesterday is None


def test_today_503_when_no_bosses():
    with pytest.raises(HTTPException) as exc:
        run(today(db=FakeSession([])))
    assert exc.value.status_code == 503


def test_guess_correct_is_all_match():
    answer = _todays_answer(ROSTER)
    resp = run(guess(BossGuessRequest(
        boss_id=answer.id), db=FakeSession(ROSTER)))
    assert resp.is_correct is True
    assert all(v == "match" for v in resp.feedback.model_dump().values())


def test_guess_incorrect_matches_pure_feedback():
    answer = _todays_answer(ROSTER)
    other = next(b for b in ROSTER if b.id != answer.id)
    resp = run(guess(BossGuessRequest(
        boss_id=other.id), db=FakeSession(ROSTER)))
    assert resp.is_correct is False
    assert resp.guess.id == other.id
    assert resp.feedback.model_dump() == boss_feedback(other, answer).model_dump()


def test_guess_unknown_id_is_400():
    with pytest.raises(HTTPException) as exc:
        run(guess(BossGuessRequest(boss_id=9999), db=FakeSession(ROSTER)))
    assert exc.value.status_code == 400


def test_reveal_solved_returns_answer():
    answer = _todays_answer(ROSTER)
    resp = run(reveal(RevealRequest(
        guess_ids=[answer.id]), db=FakeSession(ROSTER)))
    assert resp.id == answer.id
    assert resp.name == answer.name


def test_reveal_incomplete_is_403():
    answer = _todays_answer(ROSTER)
    wrong = next(b for b in ROSTER if b.id != answer.id)
    for ids in ([], [wrong.id], [wrong.id, wrong.id, 999999]):
        with pytest.raises(HTTPException) as exc:
            run(reveal(RevealRequest(guess_ids=ids), db=FakeSession(ROSTER)))
        assert exc.value.status_code == 403


def test_reveal_loss_unlocks_with_max_distinct_guesses():
    # MAX (7) exceeds the shared 4-boss ROSTER, so build one large enough.
    roster = [_boss(i, f"B{i}") for i in range(1, BOSSES_MAX_GUESSES + 2)]
    answer = _todays_answer(roster)
    wrong_ids = [b.id for b in roster if b.id !=
                 answer.id][:BOSSES_MAX_GUESSES]
    resp = run(reveal(RevealRequest(guess_ids=wrong_ids), db=FakeSession(roster)))
    assert resp.id == answer.id


def test_boss_read_round_trips_image():
    """The nullable image field serializes through BossRead both ways."""
    with_image = BossRead.model_validate(
        _boss(1, "Alicia", image="alicia.webp")
    )
    without = BossRead.model_validate(_boss(2, "Goblu", image=None))
    assert with_image.image == "alicia.webp"
    assert without.image is None
