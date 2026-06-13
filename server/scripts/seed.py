"""Seed character entities and the daily puzzle schedule. Idempotent; safe to re-run.

Run from server/:  uv run python scripts/seed.py   (or `npm run seed` from repo root)

Entities are UPSERTed by name, so attribute edits in the data file propagate on
re-run. Puzzle rows are ON CONFLICT DO NOTHING by date: existing assignments are
never reshuffled. Hot-fix a published puzzle via psql, not by re-seeding. The
schedule for not-yet-seeded dates is only stable while the roster and
SHUFFLE_SEED are unchanged, so extend DAYS_TO_SEED and re-run before the current
window runs out.

Character data lives in server/data/characters.json; see server/data/README.md
for sourcing and data conventions.
"""

import asyncio
import json
import random
import sys
from datetime import timedelta
from pathlib import Path

# Make the `app` package importable when run as a standalone script
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.constants import LAUNCH_DATE
from app.db import engine
from app.models import Entity, Puzzle

SHUFFLE_SEED = 33
DAYS_TO_SEED = 60

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def load_category(name: str) -> list[dict]:
    """Load a seed data category from server/data/<name>.json."""
    with open(DATA_DIR / f"{name}.json", encoding="utf-8") as f:
        return json.load(f)


ENTITIES: list[dict] = load_category("characters")


def build_schedule(names: list[str], n_days: int, seed: int) -> list[str]:
    """Deterministically assign one entity name per day.

    Keyed on sorted names (not DB ids, which vary across databases) and a single
    seeded RNG stream, so the same seed + roster yields the same schedule on any
    machine. No entity repeats on consecutive days, including cycle boundaries.
    """
    pool = sorted(names)
    rng = random.Random(seed)
    order: list[str] = []
    while len(order) < n_days:
        cycle = pool[:]
        rng.shuffle(cycle)
        if order and len(cycle) > 1 and cycle[0] == order[-1]:
            cycle[0], cycle[1] = cycle[1], cycle[0]
        order.extend(cycle)
    return order[:n_days]


async def upsert_entities(conn) -> dict[str, int]:
    """UPSERT all entities by name; return a name -> id map."""
    # `puzzleable` is a JSON-only flag (see data/README.md), not a DB column.
    rows_in = [{k: v for k, v in e.items() if k != "puzzleable"} for e in ENTITIES]
    stmt = pg_insert(Entity).values(rows_in)
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
        },
    ).returning(Entity.name, Entity.id)
    rows = (await conn.execute(stmt)).all()
    return {name: id_ for name, id_ in rows}


async def seed_puzzles(conn, name_to_id: dict[str, int]) -> int:
    """Insert puzzle rows for the seed window; return how many were inserted."""
    # Only puzzleable entities can be daily answers; the rest stay guessable
    # via autocomplete but never enter the shuffle pool.
    pool = [e["name"] for e in ENTITIES if e.get("puzzleable", True)]
    schedule = build_schedule(pool, DAYS_TO_SEED, SHUFFLE_SEED)
    rows = [
        {
            "puzzle_date": LAUNCH_DATE + timedelta(days=i),
            "puzzle_number": i + 1,
            "entity_id": name_to_id[schedule[i]],
        }
        for i in range(DAYS_TO_SEED)
    ]
    stmt = pg_insert(Puzzle).values(rows).on_conflict_do_nothing(
        index_elements=[Puzzle.puzzle_date]
    )
    result = await conn.execute(stmt)
    return result.rowcount


async def main() -> None:
    async with engine.begin() as conn:
        name_to_id = await upsert_entities(conn)
        inserted = await seed_puzzles(conn, name_to_id)
    print(f"entities upserted: {len(name_to_id)}, puzzles inserted: {inserted}")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
