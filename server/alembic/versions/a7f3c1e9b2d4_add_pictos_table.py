"""add pictos table

Revision ID: a7f3c1e9b2d4
Revises: e7c2f1a4b9d3
Create Date: 2026-06-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a7f3c1e9b2d4'
down_revision: Union[str, Sequence[str], None] = 'e7c2f1a4b9d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the pictos table for the Pictos daily-puzzle mode.

    Plain String columns for the closed-set fields (type, effect_category,
    source), mirroring the project's no-native-enum convention. `stats` is an
    ARRAY with a "{}" server_default like Entity.affiliation. Re-seed after this
    migration to populate rows from server/data/pictos.json.
    """
    op.create_table(
        "pictos",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("type", sa.String(length=16), nullable=False),
        sa.Column(
            "stats",
            postgresql.ARRAY(sa.String(length=8)),
            server_default="{}",
            nullable=False,
        ),
        sa.Column("lumina_cost", sa.Integer(), nullable=False),
        sa.Column("effect_category", sa.String(length=32), nullable=False),
        sa.Column("source", sa.String(length=16), nullable=False),
        sa.Column("zone_obtained", sa.String(length=64), nullable=False),
        sa.Column("act_introduced", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("pictos")
