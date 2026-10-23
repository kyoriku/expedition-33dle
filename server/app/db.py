from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.settings import settings


class Base(DeclarativeBase):
    """Declarative base shared by all ORM models and Alembic's metadata."""


# Pooled connections can be closed server-side while idle (e.g. a Postgres
# restart). At checkout, pool_pre_ping tests a reused connection and replaces
# it if dead, and pool_recycle replaces any connection older than 30 minutes.
engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=1800,
)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding an async session, closed on exit."""
    async with SessionLocal() as session:
        yield session
