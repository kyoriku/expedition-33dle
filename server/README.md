# Expedition 33dle — server

The FastAPI backend for [Expedition 33dle](../README.md). It serves the daily
puzzle for each mode, scores guesses, and (in production) serves the built React
SPA. See the root README for the project overview and the dev-container setup.

## Stack

- **Python 3.12** + **FastAPI** (fully async)
- **SQLAlchemy 2.0** (async, `asyncpg` driver) + **Alembic** migrations
- **Uvicorn** ASGI server
- **PostgreSQL 16**
- Managed with [uv](https://docs.astral.sh/uv/); tested with **pytest**

## Layout

```
app/
  main.py          FastAPI app: includes routers, /api/health, serves client/dist
  settings.py      env-sourced settings (DATABASE_URL); pydantic-settings
  db.py            async engine, session factory, get_db() dependency, Base
  constants.py     LAUNCH_DATE, SHUFFLE_SEED, CLASSIC/PICTOS_MAX_GUESSES
  models.py        SQLAlchemy models: Entity (characters), Picto
  schemas.py       Pydantic request/response models + feedback literals
  routers/
    classic.py     /api/classic/{today,guess,reveal}
    pictos.py      /api/pictos/{today,guess,reveal}
  services/
    scheduling.py  get_puzzle_for_date() — deterministic on-demand selection
    compare.py     classic_feedback() / picto_feedback() — pure scoring
data/              JSON seed data + per-mode field docs (see data/README.md)
alembic/           migrations (versions/) + env.py
scripts/
  seed.py          sync data/*.json into the DB (idempotent)
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

All routes are under `/api`. Both modes share the same shape:

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/api/<mode>/today` | — | `puzzle_date`, `puzzle_number`, the full guessable roster, and yesterday's answer. The answer is **never** singled out. |
| `POST` | `/api/<mode>/guess` | `{ entity_id }` / `{ picto_id }` | The guessed row, per-attribute `feedback`, and `is_correct`. |
| `POST` | `/api/<mode>/reveal` | `{ guess_ids: int[] }` | Today's answer — **only** if the proof shows the game is over. |
| `GET` | `/api/health` | — | `{ "status": "ok" }` |

`<mode>` is `classic` or `pictos`. In production `app.main` also mounts
`client/dist`: any non-`/api` path falls back to `index.html` (so client routes
work on refresh), while unmatched `/api/*` paths still return a JSON 404.

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
- **Set** fields (`element`, `affiliation`, `stats`) → `match` / `partial` / `miss`
  (full overlap / any overlap / disjoint)
- **Numeric** fields (`act_introduced`, `lumina_cost`) → `match` / `higher` /
  `lower`, answer-relative ("higher" = the answer's value is larger than the guess)

Field-by-field mappings are documented per mode in
[`data/characters.md`](data/characters.md) and [`data/pictos.md`](data/pictos.md).

## Daily puzzle

The daily answer is **not stored**. [`app/services/scheduling.py`](app/services/scheduling.py)
`get_puzzle_for_date()` computes it on demand as a pure function of (date, sorted
roster, `SHUFFLE_SEED`, and a per-mode salt — `""` for classic, `"pictos"` for
pictos, so the modes pick uncorrelated answers). `puzzle_number` =
`(date − LAUNCH_DATE).days + 1`. Changing a roster or `SHUFFLE_SEED` reshuffles the
date→answer map for every day — freeze both once live. Full details in
[`data/README.md`](data/README.md).

## Data & migrations

Game data is JSON in [`data/`](data/README.md). `scripts/seed.py` UPSERTs each
category by `name` and prunes rows no longer in the JSON, so the tables mirror the
files exactly (it does **not** create tables — run `alembic upgrade head` first).
Schema changes are Alembic migrations in `alembic/versions/`:

```bash
uv run alembic revision --autogenerate -m "describe change"   # create
uv run alembic upgrade head                                    # apply
```

## Testing

```bash
uv run pytest
```

Covers guess feedback (`test_feedback.py`, `test_picto_feedback.py`), deterministic
scheduling (`test_scheduling.py`), and the HTTP endpoints (`test_endpoints.py`,
`test_pictos_endpoints.py`).
