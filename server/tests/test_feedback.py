"""Unit tests for compute_feedback — the per-attribute scoring core.

Pure function over two entity rows; no DB or async. Covers every branch of the
non-trivial fields (element, act) plus the scalar equals/not-equals fields.
"""

from app.models import Entity
from app.routers.puzzles import compute_feedback

# A complete, valid baseline; tests override only the fields under test.
BASE = dict(
    name="Base",
    gender="female",
    role="Scholar",
    weapon="Staff",
    element=["Fire"],
    act_introduced=2,
    category="Human",
    affiliation=["Expedition 33"],
    zone="Lumière",
)


def make(**overrides) -> Entity:
    return Entity(**{**BASE, "id": 1, **overrides})


def test_identical_entities_all_match():
    fb = compute_feedback(make(), make())
    assert fb.gender == "match"
    assert fb.role == "match"
    assert fb.weapon == "match"
    assert fb.element == "match"
    assert fb.act_introduced == "match"
    assert fb.category == "match"
    assert fb.affiliation == "match"
    assert fb.zone == "match"


def test_scalar_mismatches():
    guess = make(gender="male", role="Boss", weapon="Sword",
                 category="Nevron", affiliation=["Independent"], zone="The Manor")
    answer = make()
    fb = compute_feedback(guess, answer)
    assert fb.gender == "miss"
    assert fb.role == "miss"
    assert fb.weapon == "miss"
    assert fb.category == "miss"
    assert fb.affiliation == "miss"
    assert fb.zone == "miss"


def test_affiliation_partial_when_sets_overlap():
    # guess shares one affiliation with the answer but not all -> partial
    guess = make(affiliation=["Lumière"])
    answer = make(affiliation=["Expedition 33", "Lumière"])
    assert compute_feedback(guess, answer).affiliation == "partial"


def test_zone_match_and_miss():
    assert compute_feedback(make(zone="Lumière"), make(zone="Lumière")).zone == "match"
    assert compute_feedback(make(zone="The Manor"), make(zone="Lumière")).zone == "miss"


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
