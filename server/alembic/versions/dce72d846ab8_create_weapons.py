"""create weapons

Revision ID: dce72d846ab8
Revises: b1a2c3d4e5f6
Create Date: 2026-06-21 21:18:15.019054

Adds the weapons table for the Weapon daily-puzzle mode, parallel to pictos:
plain String columns for the categorical fields (no PG enums) and a Postgres
ARRAY for the multi-valued scaling_stats. Mirrors the pictos block in the
squashed baseline (b1a2c3d4e5f6).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'dce72d846ab8'
down_revision: Union[str, Sequence[str], None] = 'b1a2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the weapons table in its final shape."""
    op.create_table(
        "weapons",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("wielder", sa.String(length=32), nullable=False),
        sa.Column("element", sa.String(length=16), nullable=False),
        sa.Column("max_power", sa.Integer(), nullable=False),
        sa.Column(
            "scaling_stats",
            postgresql.ARRAY(sa.String(length=16)),
            server_default="{}",
            nullable=False,
        ),
        sa.Column("source", sa.String(length=16), nullable=False),
        sa.Column("act_introduced", sa.Integer(), nullable=False),
        sa.Column("image", sa.String(length=128), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )


def downgrade() -> None:
    """Drop the weapons table."""
    op.drop_table("weapons")
