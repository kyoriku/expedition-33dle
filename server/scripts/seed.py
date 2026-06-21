"""Sync game data from JSON into the database. Idempotent; safe to re-run.

Run from server/:  uv run python scripts/seed.py   (or `npm run seed` from repo root)

Rows are UPSERTed by name, so attribute edits in the data files propagate on
re-run, and rows removed from the JSON are pruned from the DB. This script no
longer schedules puzzles: the daily answer is computed on demand by
app.services.scheduling as a pure function of the date and roster.

Seeds two modes: Classic characters (server/data/characters.json) and Pictos
(server/data/pictos.json); see server/data/README.md for sourcing conventions.
"""

import asyncio
import json
import sys
from pathlib import Path

# Make the `app` package importable when run as a standalone script
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete, literal_column
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.db import engine
from app.models import Character, Picto

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def load_category(name: str) -> list[dict]:
    """Load a seed data category from server/data/<name>.json."""
    with open(DATA_DIR / f"{name}.json", encoding="utf-8") as f:
        return json.load(f)


CHARACTERS: list[dict] = load_category("characters")
PICTOS: list[dict] = load_category("pictos")
# `image` is optional in pictos.json and populated incrementally (R5b). Default it
# to None so every row carries the key — pg_insert().values() requires a consistent
# column set across the multi-row VALUES clause (mixing keyed/unkeyed rows errors).
for _p in PICTOS:
    _p.setdefault("image", None)


async def prune_characters(conn) -> int:
    """Delete DB characters no longer present in the JSON.

    Keeps the seed idempotent for removals as well as additions: re-running
    after trimming the roster brings the DB back to exactly the JSON set.
    """
    names = [c["name"] for c in CHARACTERS]
    result = await conn.execute(delete(Character).where(Character.name.notin_(names)))
    return result.rowcount


async def upsert_characters(conn) -> dict[str, int]:
    """UPSERT all characters by name; return a name -> id map."""
    stmt = pg_insert(Character).values(CHARACTERS)
    stmt = stmt.on_conflict_do_update(
        index_elements=[Character.name],
        set_={
            "gender": stmt.excluded.gender,
            "role": stmt.excluded.role,
            "weapon": stmt.excluded.weapon,
            "element": stmt.excluded.element,
            "act_introduced": stmt.excluded.act_introduced,
            "category": stmt.excluded.category,
            "affiliation": stmt.excluded.affiliation,
            "zone": stmt.excluded.zone,
            "image": stmt.excluded.image,
        },
    ).returning(Character.name, Character.id)
    rows = (await conn.execute(stmt)).all()
    return {name: id_ for name, id_ in rows}


async def prune_pictos(conn) -> int:
    """Delete DB pictos no longer present in the JSON (mirrors prune_characters)."""
    names = [p["name"] for p in PICTOS]
    result = await conn.execute(delete(Picto).where(Picto.name.notin_(names)))
    return result.rowcount


async def upsert_pictos(conn) -> tuple[int, int]:
    """UPSERT all pictos by name; return (inserted, updated) counts.

    The `(xmax = 0)` trick: in an INSERT ... ON CONFLICT, a freshly inserted row
    has xmax 0, while a row hit by the DO UPDATE branch has a nonzero xmax. So
    `(xmax = 0)` is TRUE for inserts and FALSE for updates, letting one round-trip
    report both counts.
    """
    stmt = pg_insert(Picto).values(PICTOS)
    stmt = stmt.on_conflict_do_update(
        index_elements=[Picto.name],
        set_={
            c: stmt.excluded[c]
            for c in (
                "type",
                "stats",
                "lumina_cost",
                "effect_category",
                "source",
                "zone_obtained",
                "act_introduced",
                "image",
            )
        },
    ).returning(Picto.name, literal_column("(xmax = 0)").label("inserted"))
    rows = (await conn.execute(stmt)).all()
    inserted = sum(1 for _, ins in rows if ins)
    return inserted, len(rows) - inserted


async def main() -> None:
    async with engine.begin() as conn:
        pruned = await prune_characters(conn)
        name_to_id = await upsert_characters(conn)
        pictos_pruned = await prune_pictos(conn)
        p_ins, p_upd = await upsert_pictos(conn)
    print(f"characters pruned: {pruned}, upserted: {len(name_to_id)}")
    print(
        f"pictos pruned: {pictos_pruned}, inserted: {p_ins}, "
        f"updated: {p_upd}, total: {p_ins + p_upd}"
    )
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
