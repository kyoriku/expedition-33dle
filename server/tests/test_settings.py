"""DATABASE_URL scheme normalization (managed hosts hand out postgres[ql]://,
the async engine needs postgresql+asyncpg://)."""

import pytest

from app.settings import Settings

TAIL = "user:pass@host:5432/db"


@pytest.mark.parametrize(
    "given",
    [f"postgres://{TAIL}", f"postgresql://{TAIL}", f"postgresql+asyncpg://{TAIL}"],
)
def test_all_forms_yield_asyncpg_scheme(given):
    s = Settings(database_url=given)
    assert s.database_url == f"postgresql+asyncpg://{TAIL}"


def test_already_correct_url_is_byte_identical():
    given = f"postgresql+asyncpg://{TAIL}"
    assert Settings(database_url=given).database_url == given
