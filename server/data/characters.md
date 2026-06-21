# characters.json — Classic mode

33 characters for the Classic daily puzzle. Fields map 1:1 to
`app/models.py:Character`. See [README.md](README.md) for the shared seeding model,
daily-puzzle computation, and image conventions.

## Field reference

Fields appear in schema order:

| Field | Type | Maps to |
|---|---|---|
| `name` | string | `characters.name` (unique) |
| `gender` | string | `characters.gender` — `male` \| `female` \| `unknown` |
| `role` | string (closed set) | `characters.role` (NOT NULL) — gameplay role |
| `weapon` | string | `characters.weapon` (NOT NULL) |
| `element` | array of strings | `characters.element` (Postgres `ARRAY(String)`) |
| `act_introduced` | int | `characters.act_introduced` — 1 \| 2 \| 3 |
| `category` | string (closed set) | `characters.category` |
| `affiliation` | array of strings (closed set) | `characters.affiliation` (Postgres `ARRAY(String)`) |
| `zone` | string (closed set) | `characters.zone` (NOT NULL) — see below |
| `image` | string or null | `characters.image` — portrait filename (see [README.md](README.md#images)) |

## Closed value sets

Prefer keeping every value at ≥2 members so a lone value can't give an answer
away — but several attributes intentionally carry singletons (see below).

- `role` (closed set): Playable, NPC, Boss, Optional Boss.
- `category`: Human, Painted Human, Gestral, Axon, Nevron, Mythical Creature
- `affiliation` (**array** — a character can belong to several): Expedition 33,
  Lumière, Expedition Zero, Dessendre Family, Painted Dessendre Family, Gestrals,
  Independent. Scored as a set like `element` (exact / partial overlap / miss).
- `zone` (20 values): Lumière, Spring Meadows, Flying Waters, Ancient Sanctuary,
  Esquie's Nest, Gestral Village, Stone Wave Cliffs, Forgotten Battlefield,
  Landing Beach, Sirène, Visages, The Reacher, The Monolith, White Sands,
  Falling Leaves, The Manor, The Abyss, Flying Manor, Frozen Hearts,
  Monoco's Station

  Distribution across the 33-character roster: Lumière 6 · The Manor 5 ·
  Stone Wave Cliffs 2 · Flying Waters 2 · Esquie's Nest 2 · Sirène 2; the
  remaining 14 zones (Gestral Village [Golgra only], Landing Beach, Monoco's
  Station, The Reacher, Visages, The Monolith, The Abyss, Flying Manor, Spring
  Meadows, Ancient Sanctuary, Forgotten Battlefield, White Sands, Falling Leaves,
  Frozen Hearts) have a single character each.
  Singletons are acceptable: closed-set attributes are scored match/miss (or set
  overlap), so a unique value just yields a clean miss against every other answer.

## Scoring

`classic_feedback` (`app/services/compare.py`) compares a guess to the answer
attribute by attribute: scalar **match / miss** for the closed-set fields
(`gender`, `role`, `weapon`, `category`, `zone`); set overlap **match / partial /
miss** for `element` and `affiliation`; directional **match / higher / lower** for
`act_introduced`. Win = same `name`.

## Conventions

**Affiliation is multi-value faction membership, not provenance.** A character can
belong to several factions at once (e.g. party members carry `Expedition 33` plus
their home faction; Maelle also carries `Dessendre Family`). Only blood-relation
Dessendres carry `Dessendre Family` / `Painted Dessendre Family`; their creations
(Axons, Nevrons) are `Independent` regardless of who made them or which side they
fight for. Scored as a set: full overlap = match, partial overlap = partial,
none = miss.

**act_introduced** — party members get the act they become playable (Verso 2,
Monoco 2). NPCs and bosses get the act of first appearance. The Prologue
counts as Act 1.

**Sparse-data values:**
- `weapon: "None"` — non-combatant; never fights on-screen. DB column is NOT
  NULL, so this is the literal string, not a null.
- `weapon: "Hybrid"` — fights but wields no discrete weapon (spells,
  abilities, body, magical effects).
- `element: []` — no elemental affinity.
- `gender: "unknown"` — gender not established in any source (most Nevron/Axon bosses).

**Uniqueness invariant** — characters should have a unique 8-attribute vector
(image excluded; `element` and `affiliation` compared as sets). Verify
clone-freeness after any add, modify, or rename. **Accepted exception:** Sophie
and Emma share an identical vector (both Lumière civilians) — a deliberate,
documented clone.
