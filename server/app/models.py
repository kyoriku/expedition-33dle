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
    gender: Mapped[str] = mapped_column(String(16))  # male | female | other
    age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    class_role: Mapped[str] = mapped_column(String(64))  # avoids `class` keyword
    weapon: Mapped[str] = mapped_column(String(64))
    element: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, server_default="{}"
    )
    act_introduced: Mapped[int] = mapped_column(Integer)  # 1 | 2 | 3
    species: Mapped[str] = mapped_column(String(32), server_default="Unknown")
    affiliation: Mapped[str] = mapped_column(String(64), server_default="Unknown")
    # Portrait filename served from client/public/portraits/<image>; nullable so
    # the UI falls back to a monogram when art is missing.
    image: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
