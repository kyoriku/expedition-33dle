# Seed data

Each game mode's seed data lives here as JSON, loaded by `scripts/seed.py` via
`load_category("<name>")`. To add a future category, drop
`<name>.json` in this directory and wire a `load_category("<name>")` call into the
seed script.

This README covers the mechanics shared by every category; the per-category field
references live in their own files.

## Categories

| File | Doc | Roster | Mode | Model (`app/models.py`) |
|---|---|---|---|---|
| `characters.json` | [characters.md](characters.md) | 33 characters | Classic | `Character` |
| `pictos.json` | [pictos.md](pictos.md) | 201 pictos | Pictos | `Picto` |
| `weapons.json` | [weapons.md](weapons.md) | 116 weapons | Weapons | `Weapon` |
| `bosses.json` | [bosses.md](bosses.md) | 50 bosses | Bosses | `Boss` |

## Seeding model

Edits here propagate on the next `npm run seed`. Each category UPSERTs by `name`
and prunes rows no longer present in its JSON, so every table mirrors its file
exactly. **Renaming an entry creates a new row** rather than updating the old one,
so treat `name` as the identity key. (See `upsert_*` / `prune_*` in
`scripts/seed.py`.)

## Daily puzzle

The daily puzzle is **not** stored — `app/services/scheduling.py`
(`get_puzzle_for_date`) computes it on demand as a pure function of (date, sorted
roster, `SHUFFLE_SEED`, and a per-mode **salt**). There is no puzzles table to
freeze or hot-fix.

The salt namespaces each mode's schedule so their answers are uncorrelated on the
same day: Classic uses `"classic"`, Pictos `"pictos"`, Weapons `"weapons"`, Bosses
`"bosses"` — each a `*_SALT` constant at the top of its router in `app/routers/`. `puzzle_number` is
shared across modes — it's just date math: days since `LAUNCH_DATE` (2026-07-30) + 1.

The flip side: changing a roster (add/remove/rename) or `SHUFFLE_SEED` reshuffles
the date→answer mapping for *every* day, past and future (`puzzle_number` stays
put, but which entry it resolves to shifts). Harmless pre-launch; once live, treat
the rosters and seed as frozen.

## Images

`image` is a filename served from `client/public/<dir>/<image>` — `portraits/`
for characters, `pictos/` for pictos, `weapons/` for weapons, `bosses/` for bosses. The column is nullable:
a missing, unset, or failed-to-load image renders a gold-monogram fallback, so each
mode works without art. Multiple entries may reference the same icon file (common for
pictos). Use art you have the rights to; do not commit ripped game assets.
