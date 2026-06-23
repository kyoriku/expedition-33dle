"""Unit tests for weapon_feedback — the per-attribute scoring core for weapons.

Pure function over two weapon rows; no DB or async. Covers every branch of the
non-trivial fields (wielder, scaling_stats, the two directional fields) plus the
scalar equals/not-equals fields.
"""

from app.models import Weapon
from app.services.compare import weapon_feedback

# A complete, valid baseline; tests override only the fields under test.
BASE = dict(
    name="Base",
    wielder=["Gustave", "Verso"],
    element="Physical",
    max_power=3000,
    scaling_stats=["Vitality", "Defense"],
    source="Pickup",
    act_introduced=2,
)


def make(**overrides) -> Weapon:
    return Weapon(**{**BASE, "id": 1, **overrides})


def test_identical_weapons_all_match():
    fb = weapon_feedback(make(), make())
    assert fb.wielder == "match"
    assert fb.element == "match"
    assert fb.max_power == "match"
    assert fb.scaling_stats == "match"
    assert fb.source == "match"
    assert fb.act_introduced == "match"


def test_scalar_mismatches():
    guess = make(element="Fire", source="Merchant")
    fb = weapon_feedback(guess, make())
    assert fb.element == "miss"
    assert fb.source == "miss"


def test_wielder_match_partial_miss():
    # equal sets (order-independent) -> match
    assert weapon_feedback(make(wielder=["Gustave", "Verso"]),
                           make(wielder=["Verso", "Gustave"])).wielder == "match"
    # overlapping but unequal -> partial
    assert weapon_feedback(make(wielder=["Gustave"]),
                           make(wielder=["Gustave", "Verso"])).wielder == "partial"
    # disjoint -> miss
    assert weapon_feedback(make(wielder=["Lune"]),
                           make(wielder=["Maelle"])).wielder == "miss"


def test_scaling_stats_match_partial_miss():
    # equal sets (order-independent) -> match
    assert weapon_feedback(make(scaling_stats=["Vitality", "Defense"]),
                           make(scaling_stats=["Defense", "Vitality"])).scaling_stats == "match"
    # overlapping but unequal -> partial
    assert weapon_feedback(make(scaling_stats=["Vitality"]),
                           make(scaling_stats=["Vitality", "Defense"])).scaling_stats == "partial"
    # disjoint -> miss
    assert weapon_feedback(make(scaling_stats=["Vitality"]),
                           make(scaling_stats=["Luck"])).scaling_stats == "miss"


def test_scaling_stats_both_empty_is_match():
    assert weapon_feedback(make(scaling_stats=[]),
                           make(scaling_stats=[])).scaling_stats == "match"


def test_scaling_stats_one_empty_is_miss():
    assert weapon_feedback(make(scaling_stats=[]),
                           make(scaling_stats=["Vitality"])).scaling_stats == "miss"


def test_max_power_higher_lower_match():
    assert weapon_feedback(make(max_power=1000), make(
        max_power=5000)).max_power == "higher"
    assert weapon_feedback(make(max_power=5000), make(
        max_power=1000)).max_power == "lower"
    assert weapon_feedback(make(max_power=3000), make(
        max_power=3000)).max_power == "match"


def test_act_introduced_higher_lower_match():
    assert weapon_feedback(make(act_introduced=1), make(
        act_introduced=3)).act_introduced == "higher"
    assert weapon_feedback(make(act_introduced=3), make(
        act_introduced=1)).act_introduced == "lower"
    assert weapon_feedback(make(act_introduced=2), make(
        act_introduced=2)).act_introduced == "match"
