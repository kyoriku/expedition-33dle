# Expedition 33dle — server

The FastAPI backend for [Expedition 33dle](../README.md). It serves the daily
puzzle for each mode, scores guesses, and (in production) serves the built React
SPA. See the root README for the project overview and the dev-container setup.

## Stack

- **Python 3.12** + **FastAPI** (fully async)
- **SQLAlchemy 2.0** (async, `asyncpg` driver) + **Alembic** migrations
- **Uvicorn** ASGI server
- **PostgreSQL 16**
- **sentry-sdk** error reporting — inert unless `SENTRY_DSN` is set
- Managed with [uv](https://docs.astral.sh/uv/); tested with **pytest**

## Layout

```
app/
  main.py          FastAPI app: SENTRY_DSN-gated Sentry init, routers, /api/health,
                   env-gated /api/_boom, serves client/dist; auto-docs closed
  settings.py      env-sourced settings (DATABASE_URL, SENTRY_DSN, SENTRY_ENVIRONMENT,
                   BOOM_ENABLED); normalizes postgres:// to +asyncpg; pydantic-settings
  db.py            async engine, session factory, get_db() dependency, Base
  constants.py     LAUNCH_DATE, SHUFFLE_SEED, VALID_ACTS, CLASSIC/PICTOS/WEAPONS/BOSSES_MAX_GUESSES
  models.py        SQLAlchemy models: Character, Picto, Weapon, Boss
  schemas.py       Pydantic request/response models + feedback literals
  routers/
    classic.py     /api/classic/{today,guess,reveal}
    pictos.py      /api/pictos/{today,guess,reveal}
    weapons.py     /api/weapons/{today,guess,reveal}
    bosses.py      /api/bosses/{today,guess,reveal}
  services/
    scheduling.py  get_puzzle_for_date() — deterministic on-demand selection
    compare.py     classic_feedback() / picto_feedback() / weapon_feedback() / boss_feedback() — pure scoring
data/              JSON seed data + per-mode field docs (see data/README.md)
alembic/           migrations (versions/) + env.py
scripts/
  seed.py          sync data/*.json into the DB (idempotent; membership gated — see Data & migrations)
  predeploy.sh     Railway pre-deploy: alembic upgrade head, then seed
  inspect_db.py    debug: print tables and columns
tests/             pytest suite
pyproject.toml     dependencies + pytest config
```

## Running

Everything is run from the `server/` directory with `uv` (or from the repo root
via the `npm run` wrappers — see the root README).

```bash
uv sync                                   # install dependencies
uv run alembic upgrade head               # create / migrate the schema
uv run python scripts/seed.py             # load data/*.json into the DB
uv run uvicorn app.main:app --reload --port 8001
```

`DATABASE_URL` must point at a Postgres instance, e.g.
`postgresql+asyncpg://postgres:postgres@localhost:5432/expedition33dle`. In the
dev container it is injected automatically.

## API

All routes are under `/api`. All four modes share the same shape:

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/api/<mode>/today` | — | `puzzle_date`, `puzzle_number`, the full guessable roster, and yesterday's answer. The answer is **never** singled out. |
| `POST` | `/api/<mode>/guess` | `{ character_id }` / `{ picto_id }` / `{ weapon_id }` / `{ boss_id }` | The guessed row, per-attribute `feedback`, and `is_correct`. |
| `POST` | `/api/<mode>/reveal` | `{ guess_ids: int[] }` | Today's answer — **only** if the proof shows the game is over. |
| `GET` | `/api/health` | — | `{ "status": "ok" }` |

`<mode>` is `classic`, `pictos`, `weapons`, or `bosses`. In production `app.main` also mounts
`client/dist`: any non-`/api` path falls back to `index.html` (so client routes
work on refresh), while unmatched `/api/*` paths still return a JSON 404.

Outside the table: `GET /api/_boom` is an env-gated Sentry pipeline check
(`BOOM_ENABLED=1` arms it; disarmed it answers with the same JSON 404 as any
unknown `/api/` path — see [`docs/DEPLOY.md`](../docs/DEPLOY.md)). The FastAPI
auto-docs endpoints (`/docs`, `/redoc`, `/openapi.json`) are closed
unconditionally (`docs_url=None` etc.); register future internal routes with
`include_in_schema=False` anyway, as a habit.

### Answer protection

The answer is never present in `/today` or `/guess` responses. `/reveal` uses a
**stateless proof-of-completion**: the client sends the ids it has guessed, and the
answer is returned only if it's among them (solved) or the caller made
`<MODE>_MAX_GUESSES` distinct valid guesses (lost); otherwise `403`. See the
docstring in [`app/routers/classic.py`](app/routers/classic.py) for the trade-offs.

## Guess feedback

Scoring lives in [`app/services/compare.py`](app/services/compare.py) — pure
functions of the two rows, so they're directly unit-testable. Per attribute:

- **Scalar** closed-set fields → `match` / `miss`
- **Set** fields (`affiliation`, `stats`, `wielder`, `scaling_stats`, `weakness`,
  `resistance`, and Classic's `element`) → `match` / `partial` / `miss`
  (full overlap / any overlap / disjoint). Weapons' `element` is a **scalar** —
  match/miss only, no partial.
- **Numeric** fields (`act_introduced`, `lumina_cost`, `max_power`) → `match` /
  `higher` / `lower`, answer-relative ("higher" = the answer's value is larger than
  the guess)

Field-by-field mappings are documented per mode in
[`data/characters.md`](data/characters.md), [`data/pictos.md`](data/pictos.md),
[`data/weapons.md`](data/weapons.md), and [`data/bosses.md`](data/bosses.md).

## Daily puzzle

The daily answer is **not stored**. [`app/services/scheduling.py`](app/services/scheduling.py)
`get_puzzle_for_date()` computes it on demand as a pure function of (date, sorted
roster, `SHUFFLE_SEED`, and a per-mode salt — `"classic"` / `"pictos"` / `"weapons"` / `"bosses"`,
so the modes pick uncorrelated answers). `puzzle_number` =
`(date − LAUNCH_DATE).days + 1`. Changing a roster or `SHUFFLE_SEED` reshuffles the
date→answer map for every day — freeze both once live. Full details in
[`data/README.md`](data/README.md).

## Data & migrations

Game data is JSON in [`data/`](data/README.md). `scripts/seed.py` UPSERTs each
category by `name` — attribute and image edits propagate freely on the next
seed. **Membership is gated**: the count gate aborts the run before any
database contact if a roster's JSON entry count deviates from
`EXPECTED_COUNTS` (no env var bypasses it), and DB rows missing from the JSON
abort the run instead of being pruned unless `ALLOW_SEED_PRUNE=1` is set. The
gate exists because roster membership determines the daily answer mapping —
an unguarded prune on deploy could silently reshuffle every historical
puzzle. Deliberate roster changes follow the escape path in
[`docs/DEPLOY.md`](../docs/DEPLOY.md) (Standing rules). seed.py does **not**
create tables — run `alembic upgrade head` first. Schema changes are Alembic
migrations in `alembic/versions/`:

```bash
uv run alembic revision --autogenerate -m "describe change"   # create
uv run alembic upgrade head                                    # apply
```

## Testing

```bash
uv run pytest
```

Covers guess feedback and deterministic scheduling for all four modes, the
HTTP endpoints, the seed membership gates, Sentry gating and app startup, and
settings parsing.
