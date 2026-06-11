from __future__ import annotations

from datetime import date
from typing import Optional

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Entity(Base):
    """A guessable character that can also be a daily answer."""

    __tablename__ = "entities"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128), unique=True)
    gender: Mapped[str] = mapped_column(String(16))  # male | female | other
    age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    class_role: Mapped[str] = mapped_column(String(64))  # avoids `class` keyword
    weapon: Mapped[str] = mapped_column(String(64))
    element: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, server_default="{}"
    )
    act_introduced: Mapped[int] = mapped_column(Integer)  # 1 | 2 | 3

    puzzles: Mapped[list["Puzzle"]] = relationship(back_populates="entity")


class Puzzle(Base):
    """A date -> entity mapping. One puzzle per day."""

    __tablename__ = "puzzles"

    puzzle_date: Mapped[date] = mapped_column(primary_key=True)
    entity_id: Mapped[int] = mapped_column(
        ForeignKey("entities.id", ondelete="RESTRICT"), index=True
    )
    puzzle_number: Mapped[int] = mapped_column(Integer, unique=True)

    entity: Mapped["Entity"] = relationship(back_populates="puzzles")
