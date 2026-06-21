"""Handler-level tests for the puzzle endpoints.

The route handlers are awaited directly with a fake session (via asyncio.run),
so these exercise the real wiring — schedule lookup, answer selection, scoring,
error paths — without a database, an event-loop plugin, or an HTTP client.
"""

import asyncio
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from app.constants import CLASSIC_MAX_GUESSES
from app.models import Entity
from app.routers.classic import guess, reveal, today
from app.schemas import ClassicGuessRequest, RevealRequest
from app.services.compare import classic_feedback
from app.services.scheduling import get_puzzle_for_date


def _ent(id_: int, name: str, **kw) -> Entity:
    base = dict(
        gender="female",
        role="Playable",
        weapon="Staff",
        element=["Fire"],
        act_introduced=1,
        category="Human",
        affiliation=["Expedition 33"],
        zone="Lumière",
    )
    return Entity(id=id_, name=name, **{**base, **kw})


ROSTER = [
    _ent(1, "Gustave", gender="male", role="Playable", weapon="Sword & Pistol", element=["Lightning"]),
    _ent(2, "Maelle", role="Playable", weapon="Rapier", element=["Fire", "Void"], category="Painted Human", zone="Lumière"),
    _ent(3, "Lune", role="Playable", weapon="Elemental Magic", element=["Fire", "Ice"]),
    _ent(4, "Sciel", role="Playable", weapon="Scythe", element=["Light", "Dark"], zone="Stone Wave Cliffs"),
]


class _Scalars:
    def __init__(self, items):
        self._items = items

    def all(self):
        return list(self._items)


class FakeSession:
    """Minimal stand-in for AsyncSession — only `scalars().all()` is used."""

    def __init__(self, entities):
        self._entities = entities

    async def scalars(self, *args, **kwargs):
        return _Scalars(self._entities)


def run(coro):
    return asyncio.run(coro)


def _todays_answer(entities) -> Entity:
    names = tuple(e.name for e in entities)
    name, _ = get_puzzle_for_date(datetime.now(timezone.utc).date(), names)
    return next(e for e in entities if e.name == name)


def test_today_lists_all_entities_and_hides_answer():
    resp = run(today(db=FakeSession(ROSTER)))
    assert len(resp.entities) == len(ROSTER)
    assert resp.puzzle_number >= 1
    # The schema structurally cannot leak the answer.
    assert "answer" not in resp.model_dump()


def test_today_includes_yesterday():
    resp = run(today(db=FakeSession(ROSTER)))
    assert resp.yesterday is not None
    assert resp.yesterday.name in {e.name for e in ROSTER}


def test_today_503_when_no_entities():
    with pytest.raises(HTTPException) as exc:
        run(today(db=FakeSession([])))
    assert exc.value.status_code == 503


def test_guess_correct_is_all_match():
    answer = _todays_answer(ROSTER)
    resp = run(guess(ClassicGuessRequest(entity_id=answer.id), db=FakeSession(ROSTER)))
    assert resp.is_correct is True
    assert all(v == "match" for v in resp.feedback.model_dump().values())


def test_guess_incorrect_matches_pure_feedback():
    answer = _todays_answer(ROSTER)
    other = next(e for e in ROSTER if e.id != answer.id)
    resp = run(guess(ClassicGuessRequest(entity_id=other.id), db=FakeSession(ROSTER)))
    assert resp.is_correct is False
    assert resp.guess.id == other.id
    assert resp.feedback.model_dump() == classic_feedback(other, answer).model_dump()


def test_guess_unknown_id_is_400():
    with pytest.raises(HTTPException) as exc:
        run(guess(ClassicGuessRequest(entity_id=9999), db=FakeSession(ROSTER)))
    assert exc.value.status_code == 400


def test_reveal_solved_returns_answer():
    answer = _todays_answer(ROSTER)
    resp = run(reveal(RevealRequest(guess_ids=[answer.id]), db=FakeSession(ROSTER)))
    assert resp.id == answer.id
    assert resp.name == answer.name


def test_reveal_incomplete_is_403():
    answer = _todays_answer(ROSTER)
    wrong = next(e for e in ROSTER if e.id != answer.id)
    # empty, a single wrong guess, and padding with dupes/garbage all stay locked.
    for ids in ([], [wrong.id], [wrong.id, wrong.id, 999999]):
        with pytest.raises(HTTPException) as exc:
            run(reveal(RevealRequest(guess_ids=ids), db=FakeSession(ROSTER)))
        assert exc.value.status_code == 403


def test_reveal_loss_unlocks_with_max_distinct_guesses():
    # MAX (6) exceeds the shared 4-entity ROSTER, so build one large enough to
    # make MAX distinct wrong guesses without landing on the answer.
    roster = [_ent(i, f"E{i}") for i in range(1, CLASSIC_MAX_GUESSES + 2)]
    answer = _todays_answer(roster)
    wrong_ids = [e.id for e in roster if e.id != answer.id][:CLASSIC_MAX_GUESSES]
    resp = run(reveal(RevealRequest(guess_ids=wrong_ids), db=FakeSession(roster)))
    assert resp.id == answer.id
