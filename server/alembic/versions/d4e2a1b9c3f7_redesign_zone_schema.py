"""redesign schema: drop age, rename class_role->role and species->category, add zone

Revision ID: d4e2a1b9c3f7
Revises: b7e1c9a2d3f4
Create Date: 2026-06-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e2a1b9c3f7'
down_revision: Union[str, Sequence[str], None] = 'b7e1c9a2d3f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Purely structural — no data writes. The column renames preserve existing
    row data; `zone` is added NOT NULL with a server_default so it applies on a
    populated table (matching the species/affiliation precedent). Re-seed after
    this migration to backfill real zone values.
    """
    op.drop_column("entities", "age")
    op.alter_column("entities", "class_role", new_column_name="role")
    op.alter_column("entities", "species", new_column_name="category")
    op.add_column(
        "entities",
        sa.Column(
            "zone",
            sa.String(length=64),
            nullable=False,
            server_default="Unknown",
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("entities", "zone")
    op.alter_column("entities", "category", new_column_name="species")
    op.alter_column("entities", "role", new_column_name="class_role")
    op.add_column(
        "entities",
        sa.Column("age", sa.Integer(), nullable=True),
    )
