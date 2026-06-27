"""Unit tests for boss_feedback — the per-attribute scoring core for bosses.

Pure function over two boss rows; no DB or async. Covers every branch of the
non-trivial fields (weakness, resistance, the directional act_introduced) plus the
scalar equals/not-equals fields. weakness/resistance may be empty on either side,
so empty-vs-empty and empty-vs-nonempty are exercised for both.
"""

from app.models import Boss
from app.services.compare import boss_feedback

# A complete, valid baseline; tests override only the fields under test. The set
# fields are non-empty so the identical-rows case is a meaningful all-match.
BASE = dict(
    name="Base",
    weakness=["Fire", "Light"],
    resistance=["Ice"],
    category="Nevron",
    location="Flying Manor",
    encounter="Required",
    act_introduced=2,
)


def make(**overrides) -> Boss:
    return Boss(**{**BASE, "id": 1, **overrides})


def test_identical_bosses_all_match():
    fb = boss_feedback(make(), make())
    assert fb.weakness == "match"
    assert fb.resistance == "match"
    assert fb.category == "match"
    assert fb.location == "match"
    assert fb.encounter == "match"
    assert fb.act_introduced == "match"


def test_scalar_mismatches():
    guess = make(category="Axon", location="The Reacher", encounter="Optional")
    fb = boss_feedback(guess, make())
    assert fb.category == "miss"
    assert fb.location == "miss"
    assert fb.encounter == "miss"


def test_weakness_match_partial_miss():
    # equal sets (order-independent) -> match
    assert boss_feedback(make(weakness=["Fire", "Light"]),
                         make(weakness=["Light", "Fire"])).weakness == "match"
    # overlapping but unequal -> partial
    assert boss_feedback(make(weakness=["Fire"]),
                         make(weakness=["Fire", "Light"])).weakness == "partial"
    # disjoint -> miss
    assert boss_feedback(make(weakness=["Fire"]),
                         make(weakness=["Ice"])).weakness == "miss"


def test_weakness_both_empty_is_match():
    assert boss_feedback(make(weakness=[]), make(weakness=[])).weakness == "match"


def test_weakness_one_empty_is_miss():
    assert boss_feedback(make(weakness=[]),
                         make(weakness=["Fire"])).weakness == "miss"


def test_resistance_match_partial_miss():
    # equal sets (order-independent) -> match
    assert boss_feedback(make(resistance=["Ice", "Dark"]),
                         make(resistance=["Dark", "Ice"])).resistance == "match"
    # overlapping but unequal -> partial
    assert boss_feedback(make(resistance=["Ice"]),
                         make(resistance=["Ice", "Dark"])).resistance == "partial"
    # disjoint -> miss
    assert boss_feedback(make(resistance=["Ice"]),
                         make(resistance=["Light"])).resistance == "miss"


def test_resistance_both_empty_is_match():
    assert boss_feedback(make(resistance=[]), make(resistance=[])).resistance == "match"


def test_resistance_one_empty_is_miss():
    assert boss_feedback(make(resistance=[]),
                         make(resistance=["Ice"])).resistance == "miss"


def test_act_introduced_higher_lower_match():
    assert boss_feedback(make(act_introduced=1), make(
        act_introduced=3)).act_introduced == "higher"
    assert boss_feedback(make(act_introduced=3), make(
        act_introduced=1)).act_introduced == "lower"
    assert boss_feedback(make(act_introduced=2), make(
        act_introduced=2)).act_introduced == "match"
