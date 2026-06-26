"""create bosses

Revision ID: e600e40823b7
Revises: 747426247f87
Create Date: 2026-06-23 23:03:08.054523

Adds the bosses table for the Boss daily-puzzle mode, parallel to weapons: plain
String columns for the categorical fields (no PG enums) and Postgres ARRAYs for
the multi-valued weakness/resistance. Mirrors the weapons block in dce72d846ab8.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'e600e40823b7'
down_revision: Union[str, Sequence[str], None] = '747426247f87'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the bosses table in its final shape."""
    op.create_table(
        "bosses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column(
            "weakness",
            postgresql.ARRAY(sa.String(length=16)),
            server_default="{}",
            nullable=False,
        ),
        sa.Column(
            "resistance",
            postgresql.ARRAY(sa.String(length=16)),
            server_default="{}",
            nullable=False,
        ),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("location", sa.String(length=64), nullable=False),
        sa.Column("encounter", sa.String(length=16), nullable=False),
        sa.Column("act_introduced", sa.Integer(), nullable=False),
        sa.Column("image", sa.String(length=128), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )


def downgrade() -> None:
    """Drop the bosses table."""
    op.drop_table("bosses")
