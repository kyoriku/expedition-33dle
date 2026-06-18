from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


class EntityRead(BaseModel):
    """Public view of an entity. Built from ORM rows via from_attributes."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    gender: str
    age: Optional[int] = None
    class_role: str
    weapon: str
    element: list[str]
    act_introduced: int
    species: str
    affiliation: str
    image: Optional[str] = None


class TodayResponse(BaseModel):
    """Response for GET /api/today.

    Intentionally does NOT expose which entity is the answer; the full entity
    list is included so the frontend can do autocomplete.
    """

    puzzle_date: date
    puzzle_number: int
    entities: list[EntityRead]
    yesterday: Optional[EntityRead] = None  # previous day's answer (over, so public)


ScalarFeedback = Literal["match", "miss"]
DirectionFeedback = Literal["match", "higher", "lower"]
AgeFeedback = Literal["match", "higher", "lower", "unknown"]
ElementFeedback = Literal["match", "partial", "miss"]


class GuessRequest(BaseModel):
    """Request body for POST /api/guess."""

    entity_id: int


class GuessFeedback(BaseModel):
    """Per-attribute comparison of a guess against today's answer.

    Directional values are answer-relative: "higher" means the answer's value
    is higher than the guess's. "unknown" (age only) means exactly one side
    is null. "partial" (element only) means overlapping but unequal sets.
    """

    gender: ScalarFeedback
    age: AgeFeedback
    class_role: ScalarFeedback
    weapon: ScalarFeedback
    element: ElementFeedback
    act_introduced: DirectionFeedback
    species: ScalarFeedback
    affiliation: ScalarFeedback


class GuessResponse(BaseModel):
    """Response for POST /api/guess.

    Echoes the guessed entity plus feedback. The answer entity never appears
    here in any form — name is not compared per-attribute; is_correct covers it.
    """

    guess: EntityRead
    feedback: GuessFeedback
    is_correct: bool
