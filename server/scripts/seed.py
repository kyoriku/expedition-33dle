"""Sync character entities from JSON into the database. Idempotent; safe to re-run.

Run from server/:  uv run python scripts/seed.py   (or `npm run seed` from repo root)

Entities are UPSERTed by name, so attribute edits in the data file propagate on
re-run, and entities removed from the JSON are pruned from the DB. This script no
longer schedules puzzles: the daily answer is computed on demand by
app.services.scheduling as a pure function of the date and roster.

Character data lives in server/data/characters.json; see server/data/README.md
for sourcing and data conventions.
"""

import asyncio
import json
import sys
from pathlib import Path

# Make the `app` package importable when run as a standalone script
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.db import engine
from app.models import Entity

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def load_category(name: str) -> list[dict]:
    """Load a seed data category from server/data/<name>.json."""
    with open(DATA_DIR / f"{name}.json", encoding="utf-8") as f:
        return json.load(f)


ENTITIES: list[dict] = load_category("characters")


async def prune_removed(conn) -> int:
    """Delete DB entities no longer present in the JSON.

    Keeps the seed idempotent for removals as well as additions: re-running
    after trimming the roster brings the DB back to exactly the JSON set.
    """
    names = [e["name"] for e in ENTITIES]
    result = await conn.execute(delete(Entity).where(Entity.name.notin_(names)))
    return result.rowcount


async def upsert_entities(conn) -> dict[str, int]:
    """UPSERT all entities by name; return a name -> id map."""
    stmt = pg_insert(Entity).values(ENTITIES)
    stmt = stmt.on_conflict_do_update(
        index_elements=[Entity.name],
        set_={
            "gender": stmt.excluded.gender,
            "age": stmt.excluded.age,
            "class_role": stmt.excluded.class_role,
            "weapon": stmt.excluded.weapon,
            "element": stmt.excluded.element,
            "act_introduced": stmt.excluded.act_introduced,
            "species": stmt.excluded.species,
            "affiliation": stmt.excluded.affiliation,
            "image": stmt.excluded.image,
        },
    ).returning(Entity.name, Entity.id)
    rows = (await conn.execute(stmt)).all()
    return {name: id_ for name, id_ in rows}


async def main() -> None:
    async with engine.begin() as conn:
        pruned = await prune_removed(conn)
        name_to_id = await upsert_entities(conn)
    print(f"entities pruned: {pruned}, upserted: {len(name_to_id)}")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
