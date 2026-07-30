"""Sync game data from JSON into the database. Idempotent; safe to re-run.

Run from server/:  uv run python scripts/seed.py   (or `npm run seed` from repo root)

Rows are UPSERTed by name, so attribute edits in the data files propagate on
re-run, and rows removed from the JSON are pruned from the DB. This script no
longer schedules puzzles: the daily answer is computed on demand by
app.services.scheduling as a pure function of the date and roster.

Seeds four modes: Classic characters (server/data/characters.json), Pictos
(server/data/pictos.json), Weapons (server/data/weapons.json), and Bosses
(server/data/bosses.json); see server/data/README.md for sourcing conventions.

Because this runs unattended as a deploy step, roster MEMBERSHIP is gated:
the daily answer is a pure function of the sorted name list, so an accidental
add/remove/rename reshuffles every historical answer. Two guards, both
aborting before any write:
- Entry counts must equal EXPECTED_COUNTS (no env var bypasses this).
- A non-empty prune set (DB rows absent from the JSON) aborts unless
  ALLOW_SEED_PRUNE=1 — the escape hatch for a deliberate, pinned migration.
Attribute and image edits stay freely allowed; only membership is gated.
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import get_args

# Make the `app` package importable when run as a standalone script
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete, literal_column, select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.constants import VALID_ACTS
from app.db import engine
from app.models import Boss, Character, Picto, Weapon
from app.schemas import (
    BossCategory,
    BossEncounter,
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

BOSSES: list[dict] = load_category("bosses")
# Mirror the pictos/weapons image default so every row carries the key.
for _b in BOSSES:
    _b.setdefault("image", None)

# One row per mode drives the guard + prune phases below: (mode, model, rows).
MODES = (
    ("characters", Character, CHARACTERS),
    ("pictos", Picto, PICTOS),
    ("weapons", Weapon, WEAPONS),
    ("bosses", Boss, BOSSES),
)

# Roster sizes are FROZEN while live (see module docstring). Editing these
# numbers is a deliberate act that belongs to the same change as pinning
# elapsed days' answers.
EXPECTED_COUNTS = {"characters": 33, "pictos": 201, "weapons": 116, "bosses": 50}

COUNT_GATE_RESOLUTION = (
    "Roster size is frozen while live: changing membership reshuffles every\n"
    "historical daily answer. A deliberate roster change requires, in order:\n"
    "  (a) pin elapsed days' answers first,\n"
    "  (b) edit EXPECTED_COUNTS in scripts/seed.py,\n"
    "  (c) set ALLOW_SEED_PRUNE=1 only if the change also removes entries.\n"
    "ALLOW_SEED_PRUNE does NOT bypass this count check."
)


def check_expected_counts(counts: dict[str, int]) -> list[str]:
    """Pure count gate: one message per mode whose parsed JSON entry count
    differs from EXPECTED_COUNTS; empty list = pass."""
    return [
        f"{mode}: expected {EXPECTED_COUNTS[mode]} entries, found {n}"
        for mode, n in counts.items()
        if n != EXPECTED_COUNTS[mode]
    ]


def check_prune_allowed(
    mode: str, candidates: list[str], allow: bool
) -> str | None:
    """Pure prune gate: an abort message when `candidates` (DB rows absent from
    the JSON) is non-empty and pruning wasn't explicitly allowed; None = proceed.
    An empty candidate list (the empty-DB first deploy included) always passes."""
    if not candidates or allow:
        return None
    return (
        f"{mode}: would delete {len(candidates)} DB row(s) not present in the "
        f"JSON: {', '.join(sorted(candidates))}"
    )


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


def validate_bosses(rows: list[dict]) -> None:
    """Fail LOUDLY on any enum/shape violation before the upsert (mirrors
    validate_weapons). category/encounter reuse their Literals; weakness/resistance
    reuse the shared Element taxonomy. weakness/resistance may be empty (the columns
    server-default to {}), so only distinctness + membership are enforced. location
    is free-form (open set), so it is not checked. Names must be unique.
    """
    elements = set(get_args(Element))
    categories = set(get_args(BossCategory))
    encounters = set(get_args(BossEncounter))

    seen: set[str] = set()
    for r in rows:
        name = r.get("name", "<unnamed>")
        if name in seen:
            raise ValueError(f"{name}: duplicate boss name")
        seen.add(name)
        for field in ("weakness", "resistance"):
            vals = r[field]
            if len(set(vals)) != len(vals):
                raise ValueError(f"{name}: {field} has duplicates, got {vals!r}")
            for v in vals:
                if v not in elements:
                    raise ValueError(f"{name}: invalid {field} element={v!r}")
        if r["category"] not in categories:
            raise ValueError(f"{name}: invalid category={r['category']!r}")
        if r["encounter"] not in encounters:
            raise ValueError(f"{name}: invalid encounter={r['encounter']!r}")
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


async def collect_prune_candidates(conn) -> dict[str, list[str]]:
    """Phase A: per mode, the DB names absent from the JSON. Reads only."""
    out: dict[str, list[str]] = {}
    for mode, model, rows in MODES:
        names = [r["name"] for r in rows]
        result = await conn.execute(
            select(model.name).where(model.name.notin_(names))
        )
        out[mode] = [name for (name,) in result.all()]
    return out


def gate_prunes(candidates: dict[str, list[str]], allow: bool) -> list[str]:
    """Phase B (pure): every mode's abort message, so a bad state surfaces all
    offending modes in one run; empty list = proceed."""
    return [
        msg
        for mode, cands in candidates.items()
        if (msg := check_prune_allowed(mode, cands, allow))
    ]


async def apply_prunes(conn, candidates: dict[str, list[str]]) -> dict[str, int]:
    """Phase C: DELETE exactly the gated candidates. Only reached when Phase B
    passed; keeps the seed idempotent for (deliberate) removals."""
    counts: dict[str, int] = {}
    for mode, model, _ in MODES:
        doomed = candidates[mode]
        if doomed:
            result = await conn.execute(delete(model).where(model.name.in_(doomed)))
            counts[mode] = result.rowcount
        else:
            counts[mode] = 0
    return counts


async def prune_all(conn, allow: bool) -> dict[str, int]:
    """Read-all -> gate-all -> delete-all. The gate aborts before ANY write —
    roster integrity must not depend on transaction rollback under SystemExit."""
    candidates = await collect_prune_candidates(conn)
    messages = gate_prunes(candidates, allow)
    if messages:
        print("SEED PRUNE BLOCKED — no writes performed:")
        for msg in messages:
            print(f"  {msg}")
        print(COUNT_GATE_RESOLUTION)
        sys.exit(1)
    return await apply_prunes(conn, candidates)


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


async def upsert_bosses(conn) -> tuple[int, int]:
    """UPSERT all bosses by name; return (inserted, updated) counts.

    Same `(xmax = 0)` trick as upsert_weapons to report both counts in one
    round-trip: freshly inserted rows have xmax 0, DO UPDATE rows have nonzero.
    """
    stmt = pg_insert(Boss).values(BOSSES)
    stmt = stmt.on_conflict_do_update(
        index_elements=[Boss.name],
        set_={
            c: stmt.excluded[c]
            for c in (
                "weakness",
                "resistance",
                "category",
                "location",
                "encounter",
                "act_introduced",
                "image",
            )
        },
    ).returning(Boss.name, literal_column("(xmax = 0)").label("inserted"))
    rows = (await conn.execute(stmt)).all()
    inserted = sum(1 for _, ins in rows if ins)
    return inserted, len(rows) - inserted


async def main() -> None:
    # Validate every roster up front: any enum/shape violation aborts loudly
    # before a single row is written (no silent coercion, no partial seed).
    validate_characters(CHARACTERS)
    validate_pictos(PICTOS)
    validate_weapons(WEAPONS)
    validate_bosses(BOSSES)
    # Count gate — before any DB work at all (no env var bypasses this).
    mismatches = check_expected_counts(
        {mode: len(rows) for mode, _, rows in MODES}
    )
    if mismatches:
        print("SEED COUNT GATE FAILED — no writes performed:")
        for msg in mismatches:
            print(f"  {msg}")
        print(COUNT_GATE_RESOLUTION)
        sys.exit(1)
    allow_prune = os.environ.get("ALLOW_SEED_PRUNE") == "1"
    async with engine.begin() as conn:
        # prune_all reads + gates BEFORE its deletes; a blocked prune exits
        # here having written nothing.
        pruned = await prune_all(conn, allow_prune)
        name_to_id = await upsert_characters(conn)
        p_ins, p_upd = await upsert_pictos(conn)
        w_ins, w_upd = await upsert_weapons(conn)
        b_ins, b_upd = await upsert_bosses(conn)
    print(f"characters pruned: {pruned['characters']}, upserted: {len(name_to_id)}")
    print(
        f"pictos pruned: {pruned['pictos']}, inserted: {p_ins}, "
        f"updated: {p_upd}, total: {p_ins + p_upd}"
    )
    print(
        f"weapons pruned: {pruned['weapons']}, inserted: {w_ins}, "
        f"updated: {w_upd}, total: {w_ins + w_upd}"
    )
    print(
        f"bosses pruned: {pruned['bosses']}, inserted: {b_ins}, "
        f"updated: {b_upd}, total: {b_ins + b_upd}"
    )
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
