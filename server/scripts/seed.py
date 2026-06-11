"""Seed character entities and the daily puzzle schedule. Idempotent; safe to re-run.

Run from server/:  uv run python scripts/seed.py   (or `npm run seed` from repo root)

Entities are UPSERTed by name, so attribute edits here propagate on re-run.
Puzzle rows are ON CONFLICT DO NOTHING by date: existing assignments are never
reshuffled. Hot-fix a published puzzle via psql, not by re-seeding. The schedule
for not-yet-seeded dates is only stable while the roster and SHUFFLE_SEED are
unchanged, so extend DAYS_TO_SEED and re-run before the current window runs out.

Character data verified against the Fandom wiki (clair-obscur.fandom.com, via
its MediaWiki API) and Fextralife (expedition33.wiki.fextralife.com) on
2026-06-11. Ages derive from Monolith-year birth fields (story year = MY 33).
act_introduced convention: party members = act they become playable; NPCs and
bosses = act of first appearance; Prologue counts as Act 1.
"""

import asyncio
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

# age=None where no source states one (Painted Humans, Gestrals, mythical
# creatures). weapon="None" for non-combatants (column is NOT NULL).
ENTITIES: list[dict] = [
    # -- Playable party -------------------------------------------------------
    {
        "name": "Gustave",  # born MY 65 -> 32 (Fandom); weapon type per Fextralife
        "gender": "male",
        "age": 32,
        "class_role": "Engineer",
        "weapon": "Sword & Pistol",
        "element": ["Lightning"],
        "act_introduced": 1,
    },
    {
        "name": "Maelle",  # born MY 49 -> 16 (Fandom)
        "gender": "female",
        "age": 16,
        "class_role": "Duelist",
        "weapon": "Rapier",
        "element": ["Fire"],
        "act_introduced": 1,
    },
    {
        "name": "Lune",  # born MY 65 -> 32 (Fandom); stains per Fandom Skills page
        "gender": "female",
        "age": 32,
        "class_role": "Scholar",
        "weapon": "Elemental Magic",
        "element": ["Fire", "Ice", "Lightning", "Earth", "Light"],
        "act_introduced": 1,
    },
    {
        "name": "Sciel",  # born MY 65 -> 32 (Fandom)
        "gender": "female",
        "age": 32,
        "class_role": "Fortune Teller",
        "weapon": "Scythe",
        "element": ["Dark"],
        "act_introduced": 1,
    },
    {
        "name": "Verso",  # Painted Human, no stated age; playable from Act II
        "gender": "male",
        "age": None,
        "class_role": "Swordsman",
        "weapon": "Sword & Dagger",
        "element": ["Light"],
        "act_introduced": 2,
    },
    {
        "name": "Monoco",  # Gestral, born "prior to MY 100" -> age unknown
        "gender": "male",
        "age": None,
        "class_role": "Shapeshifter",
        "weapon": "Staff",
        "element": ["Fire", "Ice", "Lightning", "Earth", "Light", "Dark"],
        "act_introduced": 2,
    },
    # -- Companions & Lumiere -------------------------------------------------
    {
        "name": "Esquie",  # joins late Act I at Esquie's Nest
        "gender": "male",
        "age": None,
        "class_role": "Mythical Companion",
        "weapon": "None",
        "element": [],
        "act_introduced": 1,
    },
    {
        "name": "Sophie",  # born MY 66 -> 33; gommaged in the Prologue
        "gender": "female",
        "age": 33,
        "class_role": "Civilian",
        "weapon": "None",
        "element": [],
        "act_introduced": 1,
    },
    {
        "name": "Emma",  # chief councilor of Lumiere, Gustave's sister
        "gender": "female",
        "age": None,
        "class_role": "Chief Councilor",
        "weapon": "None",
        "element": [],
        "act_introduced": 1,
    },
    # -- Dessendre canvas counterparts (canvas identities only) ---------------
    {
        "name": "Renoir",  # Painted Renoir, the "White-haired man"; cane weapon
        "gender": "male",
        "age": None,
        "class_role": "Commander",
        "weapon": "Cane",
        "element": [],
        "act_introduced": 1,
    },
    {
        "name": "The Paintress",  # visible from the Prologue; fights with a brush
        "gender": "female",
        "age": None,
        "class_role": "Paintress",
        "weapon": "Paintbrush",
        "element": ["Void"],
        "act_introduced": 1,
    },
    {
        "name": "Clea",  # Painted Clea "The Regent"; Act III superboss
        "gender": "female",
        "age": None,
        "class_role": "Painter",
        "weapon": "None",
        "element": ["Void"],
        "act_introduced": 3,
    },
    {
        "name": "Alicia",  # Painted Alicia, the "Masked Woman"; met in Act II
        "gender": "female",
        "age": None,
        "class_role": "Paintress",
        "weapon": "None",
        "element": [],
        "act_introduced": 2,
    },
    # -- Bosses & antagonists --------------------------------------------------
    {
        "name": "Simon",  # Expedition Zero, "The Sword of Lumiere"; Act III superboss
        "gender": "male",
        "age": None,
        "class_role": "Expeditioner",
        "weapon": "Sword",
        "element": ["Void"],
        "act_introduced": 3,
    },
    {
        "name": "Sirène",  # Axon, "She Who Plays with Wonder"
        "gender": "female",
        "age": None,
        "class_role": "Axon",
        "weapon": "None",
        "element": [],
        "act_introduced": 2,
    },
    {
        "name": "Visages",  # Axon, "He Who Guards Truth With Lies"
        "gender": "male",
        "age": None,
        "class_role": "Axon",
        "weapon": "None",
        "element": [],
        "act_introduced": 2,
    },
    {
        "name": "Goblu",  # final boss of Flying Waters; no gender on the wiki
        "gender": "other",
        "age": None,
        "class_role": "Gestral Boss",
        "weapon": "None",
        "element": [],
        "act_introduced": 1,
    },
    # -- Gestrals & creatures --------------------------------------------------
    {
        "name": "Golgra",  # Gestral chief, Gestral Village
        "gender": "female",
        "age": None,
        "class_role": "Gestral Chief",
        "weapon": "None",
        "element": [],
        "act_introduced": 1,
    },
    {
        "name": "Noco",  # Gestral merchant, Noco's Hut in Flying Waters
        "gender": "male",
        "age": None,
        "class_role": "Merchant",
        "weapon": "None",
        "element": [],
        "act_introduced": 1,
    },
    {
        "name": "François",  # Esquie's grumpy neighbor at Esquie's Nest
        "gender": "male",
        "age": None,
        "class_role": "Mythical Creature",
        "weapon": "None",
        "element": [],
        "act_introduced": 1,
    },
]


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
        },
    ).returning(Entity.name, Entity.id)
    rows = (await conn.execute(stmt)).all()
    return {name: id_ for name, id_ in rows}


async def seed_puzzles(conn, name_to_id: dict[str, int]) -> int:
    """Insert puzzle rows for the seed window; return how many were inserted."""
    schedule = build_schedule(list(name_to_id), DAYS_TO_SEED, SHUFFLE_SEED)
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
