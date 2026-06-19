"""multivalue affiliation: String -> ARRAY(String)

Revision ID: e7c2f1a4b9d3
Revises: d4e2a1b9c3f7
Create Date: 2026-06-19 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e7c2f1a4b9d3'
down_revision: Union[str, Sequence[str], None] = 'd4e2a1b9c3f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """affiliation scalar -> single-element array.

    The old scalar default ('Unknown') can't be cast to an array, so drop it
    first; convert with a USING clause that wraps each value in a one-element
    array; then set the new array default. Re-seed afterward to populate real
    multi-value affiliations from characters.json.
    """
    op.execute("ALTER TABLE entities ALTER COLUMN affiliation DROP DEFAULT")
    op.alter_column(
        "entities",
        "affiliation",
        type_=postgresql.ARRAY(sa.String(length=64)),
        existing_type=sa.String(length=64),
        existing_nullable=False,
        postgresql_using="ARRAY[affiliation]::varchar[]",
    )
    op.alter_column(
        "entities",
        "affiliation",
        existing_type=postgresql.ARRAY(sa.String(length=64)),
        existing_nullable=False,
        server_default="{}",
    )


def downgrade() -> None:
    """affiliation array -> scalar (keep the first element)."""
    op.execute("ALTER TABLE entities ALTER COLUMN affiliation DROP DEFAULT")
    op.alter_column(
        "entities",
        "affiliation",
        type_=sa.String(length=64),
        existing_type=postgresql.ARRAY(sa.String(length=64)),
        existing_nullable=False,
        postgresql_using="affiliation[1]",
    )
    op.alter_column(
        "entities",
        "affiliation",
        existing_type=sa.String(length=64),
        existing_nullable=False,
        server_default="Unknown",
    )
