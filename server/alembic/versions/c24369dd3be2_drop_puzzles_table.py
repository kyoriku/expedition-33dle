"""drop puzzles table

Revision ID: c24369dd3be2
Revises: 96530eb56073
Create Date: 2026-06-14 17:44:39.724262

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c24369dd3be2'
down_revision: Union[str, Sequence[str], None] = '96530eb56073'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Drop the puzzles table; daily answers are now computed on demand."""
    op.drop_table("puzzles")  # drops ix_puzzles_entity_id with it


def downgrade() -> None:
    # Recreating the puzzles table for downgrade is intentionally not supported.
    # The table is no longer in the model, so automatic recreation would require
    # copying the old schema into this migration. If you need to roll back,
    # restore from a database backup instead.
    raise NotImplementedError(
        "Downgrade not supported; restore from backup if needed"
    )
