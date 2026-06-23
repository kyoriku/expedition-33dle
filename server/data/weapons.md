# weapons.json — Weapons mode

116 weapons for the Weapons daily puzzle. Fields map 1:1 to `app/models.py:Weapon`.
See [README.md](README.md) for the shared seeding model, daily-puzzle computation,
and image conventions.

## Field reference

Fields appear in schema order:

| Field | Type | Maps to |
|---|---|---|
| `name` | string | `weapons.name` — `String(64)`, unique (identity key) |
| `wielder` | array of strings (closed set) | `weapons.wielder` — `ARRAY(String(16))`, NOT NULL, default `{}` |
| `element` | string (closed set) | `weapons.element` — `String(16)` |
| `max_power` | int | `weapons.max_power` — `Integer` (numeric, scored by direction) |
| `scaling_stats` | array of strings (closed set) | `weapons.scaling_stats` — `ARRAY(String(16))`, NOT NULL, default `{}` |
| `source` | string (closed set) | `weapons.source` — `String(16)` |
| `act_introduced` | int | `weapons.act_introduced` — `Integer` (1–4; scored by direction) |
| `image` | string or null | `weapons.image` — `String(128)`, **nullable** — icon filename (see [README.md](README.md#images)) |

## Closed value sets

- `wielder` components (**array** — Gustave and Verso share a weapon pool, so a
  shared weapon lists both): Gustave, Verso, Lune, Maelle, Sciel, Monoco. Scored as
  a set, like picto `stats` / character `affiliation`.
- `element` (8): Physical, Fire, Ice, Lightning, Earth, Light, Dark, Void.
- `source` (6): Starting, Boss Drop, Merchant, Pickup, Paint Cage, Quest.
- `act_introduced` (4): 1 · 2 · 3 · 4 — **Act 4 = DLC**.
- `scaling_stats` components (**array** — 1–2 per weapon): Vitality, Might, Agility,
  Defense, Luck. Scored as a set.
- `max_power` (numeric) — integer attack power; the current roster spans 1776–5948,
  scored by direction (higher / lower).

## Scoring

`weapon_feedback` (`app/services/compare.py`) compares a guess to the answer
attribute by attribute:

| Field | Comparison | Feedback |
|---|---|---|
| `wielder` | set overlap (`set_feedback`) | match / partial / miss |
| `element` | scalar equality | match / miss |
| `source` | scalar equality | match / miss |
| `scaling_stats` | set overlap (`set_feedback`) | match / partial / miss |
| `max_power` | direction (`direction_feedback`) | match / higher / lower |
| `act_introduced` | direction (`direction_feedback`) | match / higher / lower |

Win = same `name`. Players get up to 8 guesses (`WEAPONS_MAX_GUESSES`).

## Conventions

**`wielder` and `scaling_stats` are set-compared**, mirroring picto `stats` /
character `element` & `affiliation`: equal sets = match, any overlap = partial,
disjoint = miss. `wielder` is usually a single name, but Gustave & Verso share a
weapon pool, so their shared weapons carry both — and a guess that overlaps one of
two (e.g. a `[Verso]` weapon against a `[Gustave, Verso]` answer) scores **partial**.

**Images** live in `client/public/weapons/`; `image` is the filename. The column is
nullable with a gold-monogram fallback, and the seed defaults a missing `image` to
`null` before UPSERT so every row carries the key. (Art may not be in place yet —
the monogram renders until icons are added.)

**Identity is `name`.** The DB enforces only `name` uniqueness; weapons may share
most attributes (they differ by in-game stats/text that aren't all guessable columns).
</content>
