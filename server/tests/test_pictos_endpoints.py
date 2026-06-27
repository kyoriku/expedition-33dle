"""Handler-level tests for the pictos endpoints.

The route handlers are awaited directly with a fake session (via asyncio.run),
so these exercise the real wiring — schedule lookup (salted to "pictos"), answer
selection, scoring, error paths — without a database or an HTTP client. Mirrors
test_characters_endpoints.py for the classic mode.
"""

import asyncio
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from app.constants import PICTOS_MAX_GUESSES
from app.models import Picto
from app.routers.pictos import guess, reveal, today
from app.schemas import PictoGuessRequest, PictoRead, RevealRequest
from app.services.compare import picto_feedback
from app.services.scheduling import get_puzzle_for_date


def _picto(id_: int, name: str, **kw) -> Picto:
    base = dict(
        type="Offensive",
        stats=["HP", "Crit"],
        lumina_cost=10,
        effect_category="Damage",
        source="Pickup",
        zone_obtained="Flying Manor",
        act_introduced=2,
    )
    return Picto(id=id_, name=name, **{**base, **kw})


ROSTER = [
    _picto(1, "Alternating Critical", stats=[
           "SPD", "Crit"], effect_category="Critical"),
    _picto(2, "AP Discount", type="Support", stats=["SPD"], lumina_cost=30,
           effect_category="AP", source="Merchant"),
    _picto(3, "Double Third", stats=["HP", "SPD", "Crit"]),
    _picto(4, "Energising Start", type="Support", stats=["DEF"],
           effect_category="AP", zone_obtained="Old Lumière"),
]


class _Scalars:
    def __init__(self, items):
        self._items = items

    def all(self):
        return list(self._items)


class FakeSession:
    """Minimal stand-in for AsyncSession — only `scalars().all()` is used."""

    def __init__(self, pictos):
        self._pictos = pictos

    async def scalars(self, *args, **kwargs):
        return _Scalars(self._pictos)


def run(coro):
    return asyncio.run(coro)


def _todays_answer(pictos) -> Picto:
    names = tuple(p.name for p in pictos)
    name, _ = get_puzzle_for_date(
        datetime.now(timezone.utc).date(), names, salt="pictos"
    )
    return next(p for p in pictos if p.name == name)


def test_today_lists_all_pictos_and_hides_answer():
    resp = run(today(db=FakeSession(ROSTER)))
    assert len(resp.pictos) == len(ROSTER)
    assert resp.puzzle_number >= 1
    # The schema structurally cannot leak the answer.
    assert "answer" not in resp.model_dump()


def test_today_includes_yesterday():
    resp = run(today(db=FakeSession(ROSTER)))
    assert resp.yesterday is not None
    assert resp.yesterday.name in {p.name for p in ROSTER}


def test_today_503_when_no_pictos():
    with pytest.raises(HTTPException) as exc:
        run(today(db=FakeSession([])))
    assert exc.value.status_code == 503


def test_guess_correct_is_all_match():
    answer = _todays_answer(ROSTER)
    resp = run(guess(PictoGuessRequest(
        picto_id=answer.id), db=FakeSession(ROSTER)))
    assert resp.is_correct is True
    assert all(v == "match" for v in resp.feedback.model_dump().values())


def test_guess_incorrect_matches_pure_feedback():
    answer = _todays_answer(ROSTER)
    other = next(p for p in ROSTER if p.id != answer.id)
    resp = run(guess(PictoGuessRequest(
        picto_id=other.id), db=FakeSession(ROSTER)))
    assert resp.is_correct is False
    assert resp.guess.id == other.id
    assert resp.feedback.model_dump() == picto_feedback(other, answer).model_dump()


def test_guess_unknown_id_is_400():
    with pytest.raises(HTTPException) as exc:
        run(guess(PictoGuessRequest(picto_id=9999), db=FakeSession(ROSTER)))
    assert exc.value.status_code == 400


def test_reveal_solved_returns_answer():
    answer = _todays_answer(ROSTER)
    resp = run(reveal(RevealRequest(
        guess_ids=[answer.id]), db=FakeSession(ROSTER)))
    assert resp.id == answer.id
    assert resp.name == answer.name


def test_reveal_incomplete_is_403():
    answer = _todays_answer(ROSTER)
    wrong = next(p for p in ROSTER if p.id != answer.id)
    for ids in ([], [wrong.id], [wrong.id, wrong.id, 999999]):
        with pytest.raises(HTTPException) as exc:
            run(reveal(RevealRequest(guess_ids=ids), db=FakeSession(ROSTER)))
        assert exc.value.status_code == 403


def test_reveal_loss_unlocks_with_max_distinct_guesses():
    # MAX (8) exceeds the shared 4-picto ROSTER, so build one large enough.
    roster = [_picto(i, f"P{i}") for i in range(1, PICTOS_MAX_GUESSES + 2)]
    answer = _todays_answer(roster)
    wrong_ids = [p.id for p in roster if p.id !=
                 answer.id][:PICTOS_MAX_GUESSES]
    resp = run(reveal(RevealRequest(guess_ids=wrong_ids), db=FakeSession(roster)))
    assert resp.id == answer.id


def test_picto_read_round_trips_image():
    """The new nullable image field serializes through PictoRead both ways."""
    with_image = PictoRead.model_validate(
        _picto(1, "Glass Cannon", image="glass-cannon.webp")
    )
    without = PictoRead.model_validate(_picto(2, "AP Discount"))
    assert with_image.image == "glass-cannon.webp"
    assert without.image is None
