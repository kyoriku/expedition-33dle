# pictos.json — Pictos mode

201 pictos for the Pictos daily puzzle. Fields map 1:1 to `app/models.py:Picto`.
See [README.md](README.md) for the shared seeding model, daily-puzzle computation,
and image conventions.

## Field reference

Fields appear in schema order:

| Field | Type | Maps to |
|---|---|---|
| `name` | string | `pictos.name` — `String(64)`, unique (identity key) |
| `type` | string (closed set) | `pictos.type` — `String(16)` |
| `stats` | array of strings (closed set) | `pictos.stats` — `ARRAY(String(8))`, NOT NULL, default `{}` |
| `lumina_cost` | int | `pictos.lumina_cost` — `Integer` (numeric, scored by direction) |
| `effect_category` | string (closed set) | `pictos.effect_category` — `String(32)` |
| `source` | string (closed set) | `pictos.source` — `String(16)` |
| `zone_obtained` | string (open set) | `pictos.zone_obtained` — `String(64)` (not an enum — see below) |
| `act_introduced` | int | `pictos.act_introduced` — `Integer` (1–4; scored by direction) |
| `image` | string or null | `pictos.image` — `String(128)`, **nullable** — icon filename (see [README.md](README.md#images)) |

## Closed value sets

- `type` (3): Offensive, Defensive, Support
- `effect_category` (10): AP, Break, Burn, Critical, Damage, Death/Revive,
  Free Aim / Other, Heal, Shield, Status
- `source` (5): Boss Drop, Merchant, Paint Cage, Pickup, Quest
- `act_introduced` (3): 1 · 2 · 3.
- `stats` components (**array** — a picto can boost several): HP, SPD, Crit, DEF.
  Scored as a set like character `element` / `affiliation`.
- `lumina_cost` (numeric) — values present in the roster: 1, 2, 3, 5, 7, 10, 15,
  20, 30, 40.

`zone_obtained` is an **open set**, stored as a plain `String` rather than a closed
enum so DLC zones can be added without a migration. The 36 values currently in the
roster: Abbest Cave, Ancient Sanctuary, Camp, Dark Shores, Endless Night Sanctuary,
Endless Tower, Esquie's Nest, Falling Leaves, Floating Cemetery, Flying Manor,
Flying Waters, Forgotten Battlefield, Frozen Hearts, Gestral Village, Hidden
Gestral Arena, Lumière Act III, Monoco's Station, Old Lumière, Red Woods, Renoir's
Drafts, Sacred River, Sirène, Sky Island, Spring Meadows, Stone Quarry, Stone Wave
Cliffs, Stone Wave Cliffs Cave, Sunless Cliffs, The Chosen Path, The Continent, The
Crows, The Monolith, The Reacher, Verso's Drafts, Visages, Yellow Harvest.

## Scoring

`picto_feedback` (`app/services/compare.py`) compares a guess to the answer
attribute by attribute:

| Field | Comparison | Feedback |
|---|---|---|
| `type` | scalar equality | match / miss |
| `effect_category` | scalar equality | match / miss |
| `source` | scalar equality | match / miss |
| `zone_obtained` | scalar equality | match / miss |
| `stats` | set overlap (`set_feedback`) | match / partial / miss |
| `lumina_cost` | direction (`direction_feedback`) | match / higher / lower |
| `act_introduced` | direction (`direction_feedback`) | match / higher / lower |

Win = same `name`. Players get up to 8 guesses (`PICTOS_MAX_GUESSES`).

## Conventions

**`stats` is set-compared**, mirroring character `element` / `affiliation`: equal
sets = match, any overlap = partial, disjoint = miss.

**Images** live in `client/public/pictos/` and are commonly **shared** across many
pictos (e.g. several entries reference `4-pictos.webp`). The column is nullable
with a monogram fallback; the seed defaults a missing `image` to `null` before
UPSERT so every row carries the key.

**Identity is `name`.** Unlike characters, there is **no enforced
unique-attribute-vector invariant** for pictos — the DB enforces only `name`
uniqueness, and many pictos legitimately share most attributes (they differ by
in-game effect text, which isn't a guessable column).
