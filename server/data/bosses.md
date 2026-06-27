# bosses.json — Bosses mode

50 bosses for the Bosses daily puzzle. Fields map 1:1 to `app/models.py:Boss`.
See [README.md](README.md) for the shared seeding model, daily-puzzle computation,
and image conventions.

## Field reference

Fields appear in schema order:

| Field | Type | Maps to |
|---|---|---|
| `name` | string | `bosses.name` — `String(64)`, unique (identity key) |
| `weakness` | array of strings (closed set) | `bosses.weakness` — `ARRAY(String(16))`, NOT NULL, default `{}` |
| `resistance` | array of strings (closed set) | `bosses.resistance` — `ARRAY(String(16))`, NOT NULL, default `{}` |
| `category` | string (closed set) | `bosses.category` — `String(32)` |
| `location` | string (open set) | `bosses.location` — `String(64)` (not an enum — see below) |
| `encounter` | string (closed set) | `bosses.encounter` — `String(16)` |
| `act_introduced` | int | `bosses.act_introduced` — `Integer` (1–3; scored by direction) |
| `image` | string or null | `bosses.image` — `String(128)`, **nullable** — icon filename (see [README.md](README.md#images)) |

## Closed value sets

- `weakness` / `resistance` components (**arrays**, sharing the 8-value `Element`
  taxonomy with Weapon): Physical, Fire, Ice, Lightning, Earth, Light, Dark, Void.
  **Both may be empty** — 25 bosses have no listed weakness and 28 no resistance
  (a boss with no exploitable affinity). Scored as sets, like weapon
  `scaling_stats` / picto `stats`. (Current roster uses weakness ∈ {Dark, Earth,
  Fire, Ice, Light, Lightning, Void}, resistance ∈ {Dark, Earth, Fire, Ice, Light,
  Lightning, Physical}; up to 2 weaknesses and 5 resistances on a single boss.)
- `category` (6): Axon, Gestral, Human, Mythical Creature, Nevron, Painted Human.
  (Distribution: Nevron 30 · Painted Human 7 · Gestral 5 · Axon 3 · Human 3 ·
  Mythical Creature 2.)
- `encounter` (2): Required, Optional. (23 Required · 27 Optional — story bosses
  vs. optional/superbosses.)
- `act_introduced` (3): 1 · 2 · 3.

`location` is an **open set**, stored as a plain `String` rather than a closed enum
so DLC areas can be added without a migration (mirrors picto `zone_obtained`). The
28 values currently in the roster: Ancient Sanctuary, Coastal Cave, Crushing
Cavern, Endless Tower, Esquie's Nest, Falling Leaves, Flying Manor, Flying Waters,
Forgotten Battlefield, Frozen Hearts, Gestral Village, Hidden Gestral Arena,
Lumière, Monoco's Station, Root of All Evil, Sirène, Spring Meadows, Stone Wave
Cliffs, The Abyss, The Continent, The Manor, The Monolith, The Reacher, The Small
Bourgeon, Verso's Drafts, Visages, White Sands, Yellow Harvest.

## Scoring

`boss_feedback` (`app/services/compare.py`) compares a guess to the answer
attribute by attribute:

| Field | Comparison | Feedback |
|---|---|---|
| `weakness` | set overlap (`set_feedback`) | match / partial / miss |
| `resistance` | set overlap (`set_feedback`) | match / partial / miss |
| `category` | scalar equality | match / miss |
| `location` | scalar equality | match / miss |
| `encounter` | scalar equality | match / miss |
| `act_introduced` | direction (`direction_feedback`) | match / higher / lower |

Win = same `name`. Players get up to 7 guesses (`BOSSES_MAX_GUESSES`).

## Conventions

**`weakness` and `resistance` are set-compared**, mirroring weapon `scaling_stats` /
picto `stats`: equal sets = match, any overlap = partial, disjoint = miss. Because
both may be **empty**, the empty-vs-empty case scores **match** (both "no affinity")
and empty-vs-non-empty scores **miss** — no special-casing, the same `set_feedback`
the other modes use.

**`location` is an open set** (plain `String`, not an enum) so DLC areas can be
added without a migration — scored by scalar equality like picto `zone_obtained`.

**Images** live in `client/public/bosses/`; `image` is the filename. The column is
nullable with a gold-monogram fallback, and the seed defaults a missing `image` to
`null` before UPSERT so every row carries the key. (All boss `image`s are currently
`null` — the monogram renders until icons are added.)

**Identity is `name`.** The DB enforces only `name` uniqueness; bosses may share
most attributes (they differ by in-game stats/text that aren't all guessable columns).
