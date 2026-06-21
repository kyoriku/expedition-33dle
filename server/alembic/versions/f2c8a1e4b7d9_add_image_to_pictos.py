"""add image to pictos

Revision ID: f2c8a1e4b7d9
Revises: a7f3c1e9b2d4
Create Date: 2026-06-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f2c8a1e4b7d9'
down_revision: Union[str, Sequence[str], None] = 'a7f3c1e9b2d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Nullable: picto icons are optional; the UI renders a monogram fallback when
    # a picto has no image. The seed populates real filenames on next run.
    op.add_column(
        "pictos",
        sa.Column("image", sa.String(length=128), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("pictos", "image")
