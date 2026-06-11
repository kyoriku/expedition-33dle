"""Debug: list tables and columns. Run from server/."""
import asyncio
import sys
from pathlib import Path

# Make the `app` package importable when run as a standalone script
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import inspect
from app.db import engine


async def main():
    async with engine.connect() as conn:
        def show_schema(sync_conn):
            inspector = inspect(sync_conn)
            for table in inspector.get_table_names():
                print(f"\n{table}:")
                for col in inspector.get_columns(table):
                    nullable = "" if col["nullable"] is False else " (nullable)"
                    print(f"  {col['name']:20} {col['type']}{nullable}")
        await conn.run_sync(show_schema)


if __name__ == "__main__":
    asyncio.run(main())