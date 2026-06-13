"""add species and affiliation to entities

Revision ID: 96530eb56073
Revises: 52512daecf88
Create Date: 2026-06-12 21:52:09.808536

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '96530eb56073'
down_revision: Union[str, Sequence[str], None] = '52512daecf88'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # server_default backfills the NOT NULL columns on existing rows; the seed
    # script overwrites with real values immediately after.
    op.add_column(
        "entities",
        sa.Column(
            "species", sa.String(length=32), server_default="Unknown", nullable=False
        ),
    )
    op.add_column(
        "entities",
        sa.Column(
            "affiliation",
            sa.String(length=64),
            server_default="Unknown",
            nullable=False,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("entities", "affiliation")
    op.drop_column("entities", "species")
