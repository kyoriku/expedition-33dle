"""weapon wielder to array

Revision ID: 747426247f87
Revises: dce72d846ab8
Create Date: 2026-06-21 22:39:13.300492

Widens weapons.wielder from a scalar String to a Postgres ARRAY so it can be
set-compared like scaling_stats. Gustave & Verso are two wielders who share
weapons; the former "Gustave / Verso" bucket splits into {Gustave, Verso}.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '747426247f87'
down_revision: Union[str, Sequence[str], None] = 'dce72d846ab8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Convert wielder to a string array, splitting the slash-joined value.

    The USING clause strips spaces then splits on "/", so "Gustave / Verso" ->
    {Gustave, Verso} and a single wielder -> a 1-element array. server_default
    "{}" matches the model and the other array columns.
    """
    op.alter_column(
        "weapons",
        "wielder",
        existing_type=sa.String(length=32),
        type_=postgresql.ARRAY(sa.String(length=16)),
        existing_nullable=False,
        server_default="{}",
        postgresql_using="string_to_array(replace(wielder, ' ', ''), '/')",
    )


def downgrade() -> None:
    """Collapse wielder back to a "Gustave / Verso"-style slash-joined string."""
    op.alter_column(
        "weapons",
        "wielder",
        existing_type=postgresql.ARRAY(sa.String(length=16)),
        type_=sa.String(length=32),
        existing_nullable=False,
        server_default=None,
        postgresql_using="array_to_string(wielder, ' / ')",
    )
