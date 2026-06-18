"""add image to entities

Revision ID: b7e1c9a2d3f4
Revises: c24369dd3be2
Create Date: 2026-06-17 02:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7e1c9a2d3f4'
down_revision: Union[str, Sequence[str], None] = 'c24369dd3be2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Nullable: portraits are optional; the UI renders a monogram fallback when
    # an entity has no image. The seed populates real filenames on next run.
    op.add_column(
        "entities",
        sa.Column("image", sa.String(length=128), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("entities", "image")
