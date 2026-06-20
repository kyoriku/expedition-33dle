"""Per-attribute guess scoring, shared across game modes.

Pure functions over ORM rows — no I/O — so they are unit-testable. Each mode
has its own `*_feedback()` (classic now; pictos later) that builds on the
shared `set_feedback()` set-comparison primitive.
"""

from app.models import Entity
from app.schemas import ClassicGuessFeedback


def set_feedback(guess_values, answer_values) -> str:
    """Set comparison shared by multi-value fields (element, affiliation):
    equal sets -> match (covers both-empty), any overlap -> partial, else miss.
    """
    g, a = set(guess_values), set(answer_values)
    if g == a:
        return "match"
    if g & a:
        return "partial"
    return "miss"


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
