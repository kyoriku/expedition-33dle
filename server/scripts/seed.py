"""Sync game data from JSON into the database. Idempotent; safe to re-run.

Run from server/:  uv run python scripts/seed.py   (or `npm run seed` from repo root)

Rows are UPSERTed by name, so attribute edits in the data files propagate on
re-run, and rows removed from the JSON are pruned from the DB. This script no
longer schedules puzzles: the daily answer is computed on demand by
app.services.scheduling as a pure function of the date and roster.

Seeds three modes: Classic characters (server/data/characters.json), Pictos
(server/data/pictos.json), and Weapons (server/data/weapons.json); see
server/data/README.md for sourcing conventions.
"""

import asyncio
import json
import sys
from pathlib import Path
from typing import get_args

# Make the `app` package importable when run as a standalone script
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete, literal_column
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.constants import VALID_ACTS
from app.db import engine
from app.models import Character, Picto, Weapon
from app.schemas import (
    CharacterAffiliation,
    CharacterCategory,
    CharacterGender,
    CharacterRole,
    Element,
    PictoEffectCategory,
    PictoSource,
    PictoStat,
    PictoType,
    WeaponScalingStat,
    WeaponSource,
    WeaponWielder,
)

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

WEAPONS: list[dict] = load_category("weapons")
# Mirror the pictos image default so every row carries the key.
for _w in WEAPONS:
    _w.setdefault("image", None)


def validate_weapons(rows: list[dict]) -> None:
    """Fail LOUDLY on any enum/shape violation before the upsert (no coercion).

    The weapons table uses plain String columns (no PG enums, matching the Pictos
    convention), so categorical typos would otherwise insert silently. We reuse the
    schema Literals as the single source of truth for the allowed values, raising
    ValueError on the first offending row.
    """
    wielders = set(get_args(WeaponWielder))
    elements = set(get_args(Element))
    sources = set(get_args(WeaponSource))
    scaling = set(get_args(WeaponScalingStat))
    enums = {"element": elements, "source": sources}

    for r in rows:
        name = r.get("name", "<unnamed>")
        for field, allowed in enums.items():
            if r[field] not in allowed:
                raise ValueError(f"{name}: invalid {field}={r[field]!r}")
        wielder = r["wielder"]  # non-empty + distinct + in-set (like scaling_stats)
        if not wielder or len(set(wielder)) != len(wielder):
            raise ValueError(
                f"{name}: wielder must be 1+ distinct values, got {wielder!r}"
            )
        for w in wielder:
            if w not in wielders:
                raise ValueError(f"{name}: invalid wielder={w!r}")
        stats = r["scaling_stats"]
        if not 1 <= len(stats) <= 2 or len(set(stats)) != len(stats):
            raise ValueError(
                f"{name}: scaling_stats must be 1–2 distinct values, got {stats!r}"
            )
        for s in stats:
            if s not in scaling:
                raise ValueError(f"{name}: invalid scaling_stat={s!r}")
        if r["act_introduced"] not in VALID_ACTS:
            raise ValueError(
                f"{name}: invalid act_introduced={r['act_introduced']!r}"
            )


def validate_pictos(rows: list[dict]) -> None:
    """Fail LOUDLY on any enum/shape violation before the upsert (mirrors
    validate_weapons). type/effect_category/source reuse their existing read-schema
    Literals; stats reuses PictoStat. stats may be empty (the column server-defaults
    to {}), so only distinctness + membership are enforced.
    """
    enums = {
        "type": set(get_args(PictoType)),
        "effect_category": set(get_args(PictoEffectCategory)),
        "source": set(get_args(PictoSource)),
    }
    stats_allowed = set(get_args(PictoStat))

    for r in rows:
        name = r.get("name", "<unnamed>")
        for field, allowed in enums.items():
            if r[field] not in allowed:
                raise ValueError(f"{name}: invalid {field}={r[field]!r}")
        stats = r["stats"]
        if len(set(stats)) != len(stats):
            raise ValueError(f"{name}: stats has duplicates, got {stats!r}")
        for s in stats:
            if s not in stats_allowed:
                raise ValueError(f"{name}: invalid stat={s!r}")
        if r["act_introduced"] not in VALID_ACTS:
            raise ValueError(
                f"{name}: invalid act_introduced={r['act_introduced']!r}"
            )


def validate_characters(rows: list[dict]) -> None:
    """Fail LOUDLY on any enum/shape violation before the upsert (mirrors
    validate_weapons). gender/role/category reuse the Character* Literals; element
    reuses the shared Element taxonomy. element may be empty; affiliation is non-empty
    by convention ("Independent" is the explicit no-faction sentinel).
    """
    enums = {
        "gender": set(get_args(CharacterGender)),
        "role": set(get_args(CharacterRole)),
        "category": set(get_args(CharacterCategory)),
    }
    elements = set(get_args(Element))
    affiliations = set(get_args(CharacterAffiliation))

    for r in rows:
        name = r.get("name", "<unnamed>")
        for field, allowed in enums.items():
            if r[field] not in allowed:
                raise ValueError(f"{name}: invalid {field}={r[field]!r}")
        element = r["element"]
        if len(set(element)) != len(element):
            raise ValueError(f"{name}: element has duplicates, got {element!r}")
        for e in element:
            if e not in elements:
                raise ValueError(f"{name}: invalid element={e!r}")
        affiliation = r["affiliation"]
        if not affiliation or len(set(affiliation)) != len(affiliation):
            raise ValueError(
                f"{name}: affiliation must be 1+ distinct values, got {affiliation!r}"
            )
        for a in affiliation:
            if a not in affiliations:
                raise ValueError(f"{name}: invalid affiliation={a!r}")
        if r["act_introduced"] not in VALID_ACTS:
            raise ValueError(
                f"{name}: invalid act_introduced={r['act_introduced']!r}"
            )


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


async def prune_weapons(conn) -> int:
    """Delete DB weapons no longer present in the JSON (mirrors prune_pictos)."""
    names = [w["name"] for w in WEAPONS]
    result = await conn.execute(delete(Weapon).where(Weapon.name.notin_(names)))
    return result.rowcount


async def upsert_weapons(conn) -> tuple[int, int]:
    """UPSERT all weapons by name; return (inserted, updated) counts.

    Same `(xmax = 0)` trick as upsert_pictos to report both counts in one
    round-trip: freshly inserted rows have xmax 0, DO UPDATE rows have nonzero.
    """
    stmt = pg_insert(Weapon).values(WEAPONS)
    stmt = stmt.on_conflict_do_update(
        index_elements=[Weapon.name],
        set_={
            c: stmt.excluded[c]
            for c in (
                "wielder",
                "element",
                "max_power",
                "scaling_stats",
                "source",
                "act_introduced",
                "image",
            )
        },
    ).returning(Weapon.name, literal_column("(xmax = 0)").label("inserted"))
    rows = (await conn.execute(stmt)).all()
    inserted = sum(1 for _, ins in rows if ins)
    return inserted, len(rows) - inserted


async def main() -> None:
    # Validate every roster up front: any enum/shape violation aborts loudly
    # before a single row is written (no silent coercion, no partial seed).
    validate_characters(CHARACTERS)
    validate_pictos(PICTOS)
    validate_weapons(WEAPONS)
    async with engine.begin() as conn:
        pruned = await prune_characters(conn)
        name_to_id = await upsert_characters(conn)
        pictos_pruned = await prune_pictos(conn)
        p_ins, p_upd = await upsert_pictos(conn)
        weapons_pruned = await prune_weapons(conn)
        w_ins, w_upd = await upsert_weapons(conn)
    print(f"characters pruned: {pruned}, upserted: {len(name_to_id)}")
    print(
        f"pictos pruned: {pictos_pruned}, inserted: {p_ins}, "
        f"updated: {p_upd}, total: {p_ins + p_upd}"
    )
    print(
        f"weapons pruned: {weapons_pruned}, inserted: {w_ins}, "
        f"updated: {w_upd}, total: {w_ins + w_upd}"
    )
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
