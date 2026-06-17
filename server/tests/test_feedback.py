"""Unit tests for compute_feedback — the per-attribute scoring core.

Pure function over two entity rows; no DB or async. Covers every branch of the
three non-trivial fields (age, element, act) plus the scalar equals/not-equals
fields.
"""

from app.models import Entity
from app.routers.puzzles import compute_feedback

# A complete, valid baseline; tests override only the fields under test.
BASE = dict(
    name="Base",
    gender="female",
    age=30,
    class_role="Scholar",
    weapon="Staff",
    element=["Fire"],
    act_introduced=2,
    species="Human",
    affiliation="Expedition 33",
)


def make(**overrides) -> Entity:
    return Entity(**{**BASE, "id": 1, **overrides})


def test_identical_entities_all_match():
    fb = compute_feedback(make(), make())
    assert fb.gender == "match"
    assert fb.age == "match"
    assert fb.class_role == "match"
    assert fb.weapon == "match"
    assert fb.element == "match"
    assert fb.act_introduced == "match"
    assert fb.species == "match"
    assert fb.affiliation == "match"


def test_scalar_mismatches():
    guess = make(gender="male", class_role="Boss", weapon="Sword",
                 species="Nevron", affiliation="Independent")
    answer = make()
    fb = compute_feedback(guess, answer)
    assert fb.gender == "miss"
    assert fb.class_role == "miss"
    assert fb.weapon == "miss"
    assert fb.species == "miss"
    assert fb.affiliation == "miss"


def test_age_higher_lower_and_equal():
    # answer older than guess -> "higher"; younger -> "lower"; equal -> "match"
    assert compute_feedback(make(age=20), make(age=40)).age == "higher"
    assert compute_feedback(make(age=40), make(age=20)).age == "lower"
    assert compute_feedback(make(age=33), make(age=33)).age == "match"


def test_age_unknown_when_exactly_one_null():
    assert compute_feedback(make(age=None), make(age=30)).age == "unknown"
    assert compute_feedback(make(age=30), make(age=None)).age == "unknown"


def test_age_both_null_is_match():
    assert compute_feedback(make(age=None), make(age=None)).age == "match"


def test_element_match_partial_miss():
    # equal sets -> match
    assert compute_feedback(make(element=["Fire", "Ice"]),
                            make(element=["Ice", "Fire"])).element == "match"
    # overlapping but unequal -> partial
    assert compute_feedback(make(element=["Fire"]),
                            make(element=["Fire", "Ice"])).element == "partial"
    # disjoint -> miss
    assert compute_feedback(make(element=["Fire"]),
                            make(element=["Dark"])).element == "miss"


def test_element_both_empty_is_match():
    assert compute_feedback(make(element=[]), make(element=[])).element == "match"


def test_element_one_empty_is_miss():
    assert compute_feedback(make(element=[]), make(element=["Fire"])).element == "miss"


def test_act_higher_lower_match():
    assert compute_feedback(make(act_introduced=1), make(act_introduced=3)).act_introduced == "higher"
    assert compute_feedback(make(act_introduced=3), make(act_introduced=1)).act_introduced == "lower"
    assert compute_feedback(make(act_introduced=2), make(act_introduced=2)).act_introduced == "match"
