"""squashed baseline: characters + pictos

Revision ID: b1a2c3d4e5f6
Revises:
Create Date: 2026-06-21 00:00:00.000000

Single baseline that replaces the pre-launch migration history (initial schema,
column redesigns, the puzzles-table add/drop, the pictos add, image columns, and
the entities->characters rename). Collapsing them is safe because the project is
still in development with no production database to migrate.

Creating the tables fresh in their final shape also cleans up three artifacts the
incremental history left behind:
  * `characters` is created before `pictos` (creation order = mode order).
  * Columns are declared in model order (so `zone` precedes `image`), matching
    app/models.py instead of the add-column-then-redesign order.
  * `characters.name` is VARCHAR(64) (was 128), consistent with `pictos.name`,
    and the auto-named constraints/sequence are `characters_*` rather than the
    stale `entities_*` left by the old rename.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b1a2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the characters and pictos tables in their final shape."""
    # characters first so its table sorts ahead of pictos by creation order.
    op.create_table(
        "characters",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("gender", sa.String(length=16), nullable=False),
        sa.Column("role", sa.String(length=64), nullable=False),
        sa.Column("weapon", sa.String(length=64), nullable=False),
        sa.Column(
            "element",
            postgresql.ARRAY(sa.String()),
            server_default="{}",
            nullable=False,
        ),
        sa.Column("act_introduced", sa.Integer(), nullable=False),
        sa.Column(
            "category", sa.String(length=32), server_default="Unknown", nullable=False
        ),
        sa.Column(
            "affiliation",
            postgresql.ARRAY(sa.String(length=64)),
            server_default="{}",
            nullable=False,
        ),
        sa.Column(
            "zone", sa.String(length=64), server_default="Unknown", nullable=False
        ),
        sa.Column("image", sa.String(length=128), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
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
        sa.Column("image", sa.String(length=128), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )


def downgrade() -> None:
    """Drop both tables."""
    op.drop_table("pictos")
    op.drop_table("characters")
