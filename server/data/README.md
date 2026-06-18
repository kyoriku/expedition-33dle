# Seed data

Seed data categories live here as JSON, loaded by `scripts/seed.py` via
`load_category("<name>")`. To add a future category (bosses, weapons, pictos),
drop `<name>.json` in this directory and call `load_category("<name>")` from
the seed script.

## characters.json field reference

Fields appear in schema order and map 1:1 to `app/models.py:Entity`:

| Field | Type | Maps to |
|---|---|---|
| `name` | string | `entities.name` (unique) |
| `gender` | string | `entities.gender` — `male` \| `female` \| `other` |
| `role` | string | `entities.role` (NOT NULL) — class / role |
| `weapon` | string | `entities.weapon` (NOT NULL) |
| `element` | array of strings | `entities.element` (Postgres `ARRAY(String)`) |
| `act_introduced` | int | `entities.act_introduced` — 1 \| 2 \| 3 |
| `category` | string (closed set) | `entities.category` |
| `affiliation` | string (closed set) | `entities.affiliation` |
| `zone` | string (closed set) | `entities.zone` (NOT NULL) — see below |
| `image` | string or null | `entities.image` — portrait filename (see below) |

## Closed value sets

Prefer keeping every value at ≥2 members so a lone value can't give an answer
away. Accepted single-member exceptions: **affiliation** Expedition Zero (Simon),
and **zone**, which has many singletons by nature (see distribution below).

- `category`: Human, Painted Human, Gestral, Axon, Nevron, Mythical Creature
- `affiliation`: Expedition 33, Lumière, Expedition Zero, Dessendre Family,
  Painted Dessendre Family, Gestrals, Independent
- `zone` (18 values): Lumière, Spring Meadows, Flying Waters, Ancient Sanctuary,
  Esquie's Nest, Gestral Village, Stone Wave Cliffs, Forgotten Battlefield,
  Old Lumière, Sirène, Visages, The Reacher, The Monolith, White Sands,
  Falling Leaves, The Manor, The Abyss, Flying Manor

  Distribution across the 33-entity roster: Lumière 6 · The Manor 5 ·
  Stone Wave Cliffs 3 · Gestral Village 3 · Esquie's Nest 2 · Sirène 2; the
  remaining 12 zones (Old Lumière, Flying Manor, The Monolith, The Abyss,
  Visages, Flying Waters, The Reacher, Spring Meadows, Forgotten Battlefield,
  Ancient Sanctuary, White Sands, Falling Leaves) have a single entity each.
  Singletons are acceptable here: `zone` is scored as an exact match/miss, so a
  unique value just yields a clean miss against every other answer.

## Conventions

**Affiliation is faction membership, not provenance.** Only blood-relation
Dessendres carry `Dessendre Family` / `Painted Dessendre Family`. Their
creations (Axons, Nevrons) are `Independent` regardless of who made them or
which side they fight for.

**act_introduced** — party members get the act they become playable (Verso 2,
Monoco 2). NPCs and bosses get the act of first appearance. The Prologue
counts as Act 1.

**Sparse-data values:**
- `weapon: "None"` — non-combatant; never fights on-screen. DB column is NOT
  NULL, so this is the literal string, not a null.
- `weapon: "Hybrid"` — fights but wields no discrete weapon (spells,
  abilities, body, magical effects).
- `element: []` — no elemental affinity.
- `gender: "other"` — undocumented in any source.

**Uniqueness invariant** — every entity must have a unique 8-attribute vector
(image is excluded). Verify clone-freeness after any add, modify, or rename.

**Portraits** — `image` is a filename served from
`client/public/portraits/<image>`. Optional: a missing/unset image (or one that
fails to load) renders a gold-monogram fallback, so the game works without art.
Use portraits you have the rights to; do not commit ripped game assets.

## Editing & re-seeding

Entity edits here propagate on the next `npm run seed`: attributes UPSERT by
`name`, and entities deleted from this file are pruned from the DB, so the
table always matches the JSON exactly. Renaming an entity creates a new row
rather than updating the old one, so treat `name` as the identity key.

The daily puzzle is **not** stored — `app/services/scheduling.py` computes it
on demand as a pure function of (date, sorted roster, `SHUFFLE_SEED`). There
is no puzzles table to freeze or hot-fix. The flip side: changing the roster
(add/remove/rename) or `SHUFFLE_SEED` reshuffles the date→entity mapping for
*every* day, past and future — `puzzle_number` is just date math from
`LAUNCH_DATE` and stays put, but which entity it resolves to shifts. Harmless
pre-launch; once live, treat the roster and seed as frozen.