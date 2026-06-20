"""Unit tests for picto_feedback — the per-attribute scoring core for pictos.

Pure function over two picto rows; no DB or async. Covers every branch of the
non-trivial fields (stats, the two directional fields) plus the scalar
equals/not-equals fields.
"""

from app.models import Picto
from app.services.compare import picto_feedback

# A complete, valid baseline; tests override only the fields under test.
BASE = dict(
    name="Base",
    type="Offensive",
    stats=["HP", "Crit"],
    lumina_cost=10,
    effect_category="Damage",
    source="Pickup",
    zone_obtained="Flying Manor",
    act_introduced=2,
)


def make(**overrides) -> Picto:
    return Picto(**{**BASE, "id": 1, **overrides})


def test_identical_pictos_all_match():
    fb = picto_feedback(make(), make())
    assert fb.type == "match"
    assert fb.stats == "match"
    assert fb.lumina_cost == "match"
    assert fb.effect_category == "match"
    assert fb.source == "match"
    assert fb.zone_obtained == "match"
    assert fb.act_introduced == "match"


def test_scalar_mismatches():
    guess = make(
        type="Defensive",
        effect_category="Heal",
        source="Merchant",
        zone_obtained="Old Lumiere",
    )
    fb = picto_feedback(guess, make())
    assert fb.type == "miss"
    assert fb.effect_category == "miss"
    assert fb.source == "miss"
    assert fb.zone_obtained == "miss"


def test_stats_match_partial_miss():
    # equal sets (order-independent) -> match
    assert picto_feedback(make(stats=["HP", "Crit"]),
                          make(stats=["Crit", "HP"])).stats == "match"
    # overlapping but unequal -> partial
    assert picto_feedback(make(stats=["HP"]),
                          make(stats=["HP", "Crit"])).stats == "partial"
    # disjoint -> miss
    assert picto_feedback(make(stats=["HP"]),
                          make(stats=["DEF"])).stats == "miss"


def test_stats_both_empty_is_match():
    assert picto_feedback(make(stats=[]), make(stats=[])).stats == "match"


def test_stats_one_empty_is_miss():
    assert picto_feedback(make(stats=[]), make(stats=["HP"])).stats == "miss"


def test_lumina_cost_higher_lower_match():
    assert picto_feedback(make(lumina_cost=5), make(lumina_cost=20)).lumina_cost == "higher"
    assert picto_feedback(make(lumina_cost=20), make(lumina_cost=5)).lumina_cost == "lower"
    assert picto_feedback(make(lumina_cost=10), make(lumina_cost=10)).lumina_cost == "match"


def test_act_introduced_higher_lower_match():
    assert picto_feedback(make(act_introduced=1), make(act_introduced=4)).act_introduced == "higher"
    assert picto_feedback(make(act_introduced=4), make(act_introduced=1)).act_introduced == "lower"
    assert picto_feedback(make(act_introduced=2), make(act_introduced=2)).act_introduced == "match"
