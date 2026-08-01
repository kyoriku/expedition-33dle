# Seed data

Each game mode's seed data lives here as JSON, loaded by `scripts/seed.py`. A
new category needs more than a JSON file: inside the seed script, a
`load_category` constant plus entries in `MODES` and `EXPECTED_COUNTS` and a
hand-written validator and upserter (only pruning generalizes over `MODES`);
outside it, a model, migration, schemas, a router, and a compare function.

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

Attribute and image edits propagate on the next `npm run seed` — each category
UPSERTs by `name`, and a re-run with unchanged JSON leaves every row and id as
it was.

**Membership changes (add / remove / rename) are gated.** The seed aborts
before touching the database if a roster's JSON entry count differs from
`EXPECTED_COUNTS` in `scripts/seed.py` — no env var bypasses that check — and
aborts before deleting anything when DB rows are missing from the JSON, unless
`ALLOW_SEED_PRUNE=1` is set. **A rename is a membership change dressed as an
edit**: the entry count stays the same, so only the prune gate catches it —
and with `ALLOW_SEED_PRUNE=1` set it silently becomes a delete-plus-insert
under a new id. Treat `name` as the identity key.

Why the gate exists: the daily answer is a pure function of the sorted roster
(see below), so an unguarded automatic prune on every deploy could silently
reshuffle every historical puzzle. Deliberate roster changes follow the escape
path in [`docs/DEPLOY.md`](../../docs/DEPLOY.md) (Standing rules): pin elapsed
days' answers, update `EXPECTED_COUNTS`, and only then `ALLOW_SEED_PRUNE=1` if
the change also removes entries. (See the `upsert_<category>` functions and
the `MODES`-driven `prune_all` in `scripts/seed.py`.)

## Daily puzzle

The daily puzzle is **not** stored — `app/services/scheduling.py`
(`get_puzzle_for_date`) computes it on demand as a pure function of (date, sorted
roster, `SHUFFLE_SEED`, and a per-mode **salt**). There is no puzzles table to
freeze or hot-fix.

The salt namespaces each mode's schedule so their answers are uncorrelated on the
same day: Classic uses `"classic"`, Pictos `"pictos"`, Weapons `"weapons"`, Bosses
`"bosses"` — each a `*_SALT` constant at the top of its router in `app/routers/`. `puzzle_number` is
shared across modes — it's just date math: days since `LAUNCH_DATE` (2026-08-01) + 1.

The flip side: changing a roster (add/remove/rename) or `SHUFFLE_SEED` reshuffles
the date→answer mapping for *every* day, past and future (`puzzle_number` stays
put, but which entry it resolves to shifts). Harmless pre-launch; once live, treat
the rosters and seed as frozen — the seed script enforces this (see
[Seeding model](#seeding-model)).

## Images

`image` is a filename served from `client/public/<dir>/<image>` — `portraits/`
for characters, `pictos/` for pictos, `weapons/` for weapons, `bosses/` for bosses. The column is nullable:
a missing, unset, or failed-to-load image renders a gold-monogram fallback, so each
mode works without art. Multiple entries may reference the same icon file (common for
pictos). Use art you have the rights to; do not commit ripped game assets.
