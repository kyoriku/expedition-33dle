from __future__ import annotations

from typing import Optional

from sqlalchemy import Integer, String
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Entity(Base):
    """A guessable character that can also be a daily answer."""

    __tablename__ = "entities"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128), unique=True)
    gender: Mapped[str] = mapped_column(String(16))  # male | female | unknown
    role: Mapped[str] = mapped_column(String(64))  # class/role; avoids `class` keyword
    weapon: Mapped[str] = mapped_column(String(64))
    element: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, server_default="{}"
    )
    act_introduced: Mapped[int] = mapped_column(Integer)  # 1 | 2 | 3
    category: Mapped[str] = mapped_column(String(32), server_default="Unknown")
    affiliation: Mapped[list[str]] = mapped_column(
        ARRAY(String(64)), nullable=False, server_default="{}"
    )
    # Closed set of in-game zones; backfilled NOT NULL with an "Unknown" default.
    zone: Mapped[str] = mapped_column(String(64), server_default="Unknown")
    # Portrait filename served from client/public/portraits/<image>; nullable so
    # the UI falls back to a monogram when art is missing.
    image: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)


class Picto(Base):
    """A guessable Picto for the Pictos daily-puzzle mode."""

    __tablename__ = "pictos"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(64), unique=True)  # unique => unique index
    type: Mapped[str] = mapped_column(String(16))  # Offensive | Defensive | Support
    # Set-comparison field, like Entity.affiliation; room to evolve without a migration.
    stats: Mapped[list[str]] = mapped_column(
        ARRAY(String(8)), nullable=False, server_default="{}"
    )
    lumina_cost: Mapped[int] = mapped_column(Integer)
    effect_category: Mapped[str] = mapped_column(String(32))  # one of 10 closed values
    source: Mapped[str] = mapped_column(String(16))  # categorical: 5 distinct values
    zone_obtained: Mapped[str] = mapped_column(String(64))  # str, not enum: room for DLC
    act_introduced: Mapped[int] = mapped_column(Integer)  # 1 | 2 | 3 | 4 (4 = DLC)
    # Icon filename served from client/public/pictos/<image>; nullable so the UI
    # falls back to a monogram when art is missing. Pictos may share an icon file.
    image: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
