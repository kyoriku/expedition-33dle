"""Handler-level tests for the weapons endpoints.

The route handlers are awaited directly with a fake session (via asyncio.run),
so these exercise the real wiring — schedule lookup (salted to "weapons"), answer
selection, scoring, error paths — without a database or an HTTP client. Mirrors
test_pictos_endpoints.py.
"""

import asyncio
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from app.constants import WEAPONS_MAX_GUESSES
from app.models import Weapon
from app.routers.weapons import guess, reveal, today
from app.schemas import RevealRequest, WeaponGuessRequest, WeaponRead
from app.services.compare import weapon_feedback
from app.services.scheduling import get_puzzle_for_date


def _weapon(id_: int, name: str, **kw) -> Weapon:
    base = dict(
        wielder=["Gustave", "Verso"],
        element="Physical",
        max_power=3000,
        scaling_stats=["Vitality", "Defense"],
        source="Pickup",
        act_introduced=2,
    )
    return Weapon(id=id_, name=name, **{**base, **kw})


ROSTER = [
    _weapon(1, "Abysseram", scaling_stats=["Vitality", "Defense"]),
    _weapon(2, "Blodam", wielder=["Lune"], element="Light", max_power=3487,
            scaling_stats=["Agility", "Defense"], source="Boss Drop"),
    _weapon(3, "Carderam", element="Fire", scaling_stats=["Vitality", "Agility"]),
    _weapon(4, "Direulam", wielder=["Sciel"], element="Ice", scaling_stats=["Luck"],
            source="Merchant"),
]


class _Scalars:
    def __init__(self, items):
        self._items = items

    def all(self):
        return list(self._items)


class FakeSession:
    """Minimal stand-in for AsyncSession — only `scalars().all()` is used."""

    def __init__(self, weapons):
        self._weapons = weapons

    async def scalars(self, *args, **kwargs):
        return _Scalars(self._weapons)


def run(coro):
    return asyncio.run(coro)


def _todays_answer(weapons) -> Weapon:
    names = tuple(w.name for w in weapons)
    name, _ = get_puzzle_for_date(
        datetime.now(timezone.utc).date(), names, salt="weapons"
    )
    return next(w for w in weapons if w.name == name)


def test_today_lists_all_weapons_and_hides_answer():
    resp = run(today(db=FakeSession(ROSTER)))
    assert len(resp.weapons) == len(ROSTER)
    assert resp.puzzle_number >= 1
    # The schema structurally cannot leak the answer.
    assert "answer" not in resp.model_dump()


def test_today_includes_yesterday():
    resp = run(today(db=FakeSession(ROSTER)))
    assert resp.yesterday is not None
    assert resp.yesterday.name in {w.name for w in ROSTER}


def test_today_503_when_no_weapons():
    with pytest.raises(HTTPException) as exc:
        run(today(db=FakeSession([])))
    assert exc.value.status_code == 503


def test_guess_correct_is_all_match():
    answer = _todays_answer(ROSTER)
    resp = run(guess(WeaponGuessRequest(
        weapon_id=answer.id), db=FakeSession(ROSTER)))
    assert resp.is_correct is True
    assert all(v == "match" for v in resp.feedback.model_dump().values())


def test_guess_incorrect_matches_pure_feedback():
    answer = _todays_answer(ROSTER)
    other = next(w for w in ROSTER if w.id != answer.id)
    resp = run(guess(WeaponGuessRequest(
        weapon_id=other.id), db=FakeSession(ROSTER)))
    assert resp.is_correct is False
    assert resp.guess.id == other.id
    assert resp.feedback.model_dump() == weapon_feedback(other, answer).model_dump()


def test_guess_unknown_id_is_400():
    with pytest.raises(HTTPException) as exc:
        run(guess(WeaponGuessRequest(weapon_id=9999), db=FakeSession(ROSTER)))
    assert exc.value.status_code == 400


def test_reveal_solved_returns_answer():
    answer = _todays_answer(ROSTER)
    resp = run(reveal(RevealRequest(
        guess_ids=[answer.id]), db=FakeSession(ROSTER)))
    assert resp.id == answer.id
    assert resp.name == answer.name


def test_reveal_incomplete_is_403():
    answer = _todays_answer(ROSTER)
    wrong = next(w for w in ROSTER if w.id != answer.id)
    for ids in ([], [wrong.id], [wrong.id, wrong.id, 999999]):
        with pytest.raises(HTTPException) as exc:
            run(reveal(RevealRequest(guess_ids=ids), db=FakeSession(ROSTER)))
        assert exc.value.status_code == 403


def test_reveal_loss_unlocks_with_max_distinct_guesses():
    # MAX (9) exceeds the shared 4-weapon ROSTER, so build one large enough.
    roster = [_weapon(i, f"W{i}") for i in range(1, WEAPONS_MAX_GUESSES + 2)]
    answer = _todays_answer(roster)
    wrong_ids = [w.id for w in roster if w.id !=
                 answer.id][:WEAPONS_MAX_GUESSES]
    resp = run(reveal(RevealRequest(guess_ids=wrong_ids), db=FakeSession(roster)))
    assert resp.id == answer.id


def test_weapon_read_round_trips_image():
    """The nullable image field serializes through WeaponRead both ways."""
    with_image = WeaponRead.model_validate(
        _weapon(1, "Abysseram", image="abysseram.webp")
    )
    without = WeaponRead.model_validate(_weapon(2, "Blodam", image=None))
    assert with_image.image == "abysseram.webp"
    assert without.image is None
