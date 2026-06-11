from datetime import date
from typing import Optional

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


class TodayResponse(BaseModel):
    """Response for GET /api/today.

    Intentionally does NOT expose which entity is the answer; the full entity
    list is included so the frontend can do autocomplete.
    """

    puzzle_date: date
    puzzle_number: int
    entities: list[EntityRead]
