"""Per-attribute guess scoring, shared across game modes.

Pure functions over ORM rows — no I/O — so they are unit-testable. Each mode
has its own `*_feedback()` (classic, pictos, weapon, boss) that builds on the
shared `set_feedback()` set-comparison primitive.
"""

from app.models import Boss, Character, Picto, Weapon
from app.schemas import (
    BossGuessFeedback,
    ClassicGuessFeedback,
    PictoGuessFeedback,
    WeaponGuessFeedback,
)


def set_feedback(guess_values, answer_values) -> str:
    """Set comparison shared by multi-value fields (element, affiliation, stats):
    equal sets -> match (covers both-empty), any overlap -> partial, else miss.
    """
    g, a = set(guess_values), set(answer_values)
    if g == a:
        return "match"
    if g & a:
        return "partial"
    return "miss"


def direction_feedback(guess_value, answer_value) -> str:
    """Directional comparison for numeric fields, answer-relative: equal -> match,
    answer larger -> higher, answer smaller -> lower.
    """
    if guess_value == answer_value:
        return "match"
    return "higher" if answer_value > guess_value else "lower"


def classic_feedback(guess: Character, answer: Character) -> ClassicGuessFeedback:
    """Compare a guess character to the answer character, attribute by attribute.

    Pure function of the two rows — no I/O — so it is unit-testable.
    """
    element = set_feedback(guess.element, answer.element)

    if guess.act_introduced == answer.act_introduced:
        act = "match"
    else:
        act = "higher" if answer.act_introduced > guess.act_introduced else "lower"

    return ClassicGuessFeedback(
        gender="match" if guess.gender == answer.gender else "miss",
        role="match" if guess.role == answer.role else "miss",
        weapon="match" if guess.weapon == answer.weapon else "miss",
        element=element,
        act_introduced=act,
        category="match" if guess.category == answer.category else "miss",
        affiliation=set_feedback(guess.affiliation, answer.affiliation),
        zone="match" if guess.zone == answer.zone else "miss",
    )


def picto_feedback(guess: Picto, answer: Picto) -> PictoGuessFeedback:
    """Compare a guess picto to the answer picto, attribute by attribute.

    Pure function of the two rows — no I/O — so it is unit-testable. Mirrors
    classic_feedback: scalar equality for closed-set fields, set_feedback() for
    the multi-value stats, direction_feedback() for the numeric fields.
    """
    return PictoGuessFeedback(
        type="match" if guess.type == answer.type else "miss",
        stats=set_feedback(guess.stats, answer.stats),
        lumina_cost=direction_feedback(guess.lumina_cost, answer.lumina_cost),
        effect_category=(
            "match" if guess.effect_category == answer.effect_category else "miss"
        ),
        source="match" if guess.source == answer.source else "miss",
        zone_obtained=(
            "match" if guess.zone_obtained == answer.zone_obtained else "miss"
        ),
        act_introduced=direction_feedback(guess.act_introduced, answer.act_introduced),
    )


def weapon_feedback(guess: Weapon, answer: Weapon) -> WeaponGuessFeedback:
    """Compare a guess weapon to the answer weapon, attribute by attribute.

    Pure function of the two rows — no I/O. Scalar equality for the closed-set
    fields (element, source), set_feedback() for the multi-value wielder and
    scaling_stats, direction_feedback() for the numeric fields (max_power and the
    ordinal act_introduced).
    """
    return WeaponGuessFeedback(
        wielder=set_feedback(guess.wielder, answer.wielder),
        element="match" if guess.element == answer.element else "miss",
        max_power=direction_feedback(guess.max_power, answer.max_power),
        scaling_stats=set_feedback(guess.scaling_stats, answer.scaling_stats),
        source="match" if guess.source == answer.source else "miss",
        act_introduced=direction_feedback(guess.act_introduced, answer.act_introduced),
    )


def boss_feedback(guess: Boss, answer: Boss) -> BossGuessFeedback:
    """Compare a guess boss to the answer boss, attribute by attribute.

    Pure function of the two rows — no I/O. set_feedback() for the multi-value
    weakness and resistance (which may be empty on either side — empty-vs-empty is
    a match, empty-vs-nonempty a miss, with no special-casing), scalar equality for
    the closed-set and free-form scalar fields (category, location, encounter), and
    direction_feedback() for the ordinal act_introduced.
    """
    return BossGuessFeedback(
        weakness=set_feedback(guess.weakness, answer.weakness),
        resistance=set_feedback(guess.resistance, answer.resistance),
        category="match" if guess.category == answer.category else "miss",
        location="match" if guess.location == answer.location else "miss",
        encounter="match" if guess.encounter == answer.encounter else "miss",
        act_introduced=direction_feedback(guess.act_introduced, answer.act_introduced),
    )
