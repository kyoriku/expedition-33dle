"""Per-attribute guess scoring, shared across game modes.

Pure functions over ORM rows — no I/O — so they are unit-testable. Each mode
has its own `*_feedback()` (classic now; pictos later) that builds on the
shared `set_feedback()` set-comparison primitive.
"""

from app.models import Entity, Picto
from app.schemas import ClassicGuessFeedback, PictoGuessFeedback


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


def classic_feedback(guess: Entity, answer: Entity) -> ClassicGuessFeedback:
    """Compare a guess entity to the answer entity, attribute by attribute.

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
