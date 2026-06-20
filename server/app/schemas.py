from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


class EntityRead(BaseModel):
    """Public view of an entity. Built from ORM rows via from_attributes."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    gender: str
    role: str
    weapon: str
    element: list[str]
    act_introduced: int
    category: str
    affiliation: list[str]
    zone: str
    image: Optional[str] = None


PictoType = Literal["Offensive", "Defensive", "Support"]
PictoEffectCategory = Literal[
    "AP", "Break", "Burn", "Critical", "Damage", "Death/Revive",
    "Free Aim / Other", "Heal", "Shield", "Status",
]
PictoSource = Literal["Boss Drop", "Merchant", "Paint Cage", "Pickup", "Quest"]


class PictoRead(BaseModel):
    """Public view of a Picto. Built from ORM rows via from_attributes.

    The DB columns are plain strings, but the closed-set fields (type,
    effect_category, source) are constrained here with Literal so invalid values
    surface at the schema layer. zone_obtained stays open (str) for DLC zones.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: PictoType
    stats: list[str]
    lumina_cost: int
    effect_category: PictoEffectCategory
    source: PictoSource
    zone_obtained: str
    act_introduced: int


class ClassicTodayResponse(BaseModel):
    """Response for GET /api/classic/today.

    Intentionally does NOT expose which entity is the answer; the full entity
    list is included so the frontend can do autocomplete.
    """

    puzzle_date: date
    puzzle_number: int
    entities: list[EntityRead]
    yesterday: Optional[EntityRead] = None  # previous day's answer (over, so public)


ScalarFeedback = Literal["match", "miss"]
DirectionFeedback = Literal["match", "higher", "lower"]
ElementFeedback = Literal["match", "partial", "miss"]


class ClassicGuessRequest(BaseModel):
    """Request body for POST /api/classic/guess."""

    entity_id: int


class ClassicGuessFeedback(BaseModel):
    """Per-attribute comparison of a guess against today's answer.

    Directional values are answer-relative: "higher" means the answer's value
    is higher than the guess's (act_introduced only). "partial" (element only)
    means overlapping but unequal sets.
    """

    gender: ScalarFeedback
    role: ScalarFeedback
    weapon: ScalarFeedback
    element: ElementFeedback
    act_introduced: DirectionFeedback
    category: ScalarFeedback
    affiliation: ElementFeedback
    zone: ScalarFeedback


class ClassicGuessResponse(BaseModel):
    """Response for POST /api/classic/guess.

    Echoes the guessed entity plus feedback. The answer entity never appears
    here in any form — name is not compared per-attribute; is_correct covers it.
    """

    guess: EntityRead
    feedback: ClassicGuessFeedback
    is_correct: bool
