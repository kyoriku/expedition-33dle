# Expedition 33dle

A daily guessing game for **Clair Obscur: Expedition 33**. Each day every mode has
one answer, shared by all players and rolled over at midnight UTC. You narrow it
down from per-attribute feedback — green for a match, amber for a partial/close,
and up/down arrows for numeric hints — within a fixed number of guesses.

Live at **[expedition33dle.com](https://expedition33dle.com)**.

## Modes

| Mode | Guess | Roster | Guesses | Data |
|---|---|---|---|---|
| **Classic** | a character | 33 | 6 | [`server/data/characters.json`](server/data/characters.md) |
| **Pictos** | a Picto | 201 | 8 | [`server/data/pictos.json`](server/data/pictos.md) |
| **Weapon** | a weapon | _in progress_ | — | `server/data/weapons.json` |

Each mode picks an uncorrelated answer for the same day; see [Daily puzzle](#daily-puzzle).

## Tech stack

- **Frontend** — React 19 + TypeScript, Vite, Tailwind CSS v4, React Router, and
  TanStack Query. See [`client/README.md`](client/README.md).
- **Backend** — Python 3.12 + FastAPI (async), SQLAlchemy 2.0, Alembic migrations,
  served by Uvicorn. Managed with [uv](https://docs.astral.sh/uv/).
- **Database** — PostgreSQL 16 (asyncpg driver).

## Repository layout

```
client/              React SPA (see client/README.md)
server/
  app/
    main.py          FastAPI app: mounts routers, serves the built SPA
    models.py        SQLAlchemy models (Entity, Picto)
    constants.py     LAUNCH_DATE, SHUFFLE_SEED, per-mode guess caps
    settings.py      env-sourced settings (DATABASE_URL)
    db.py            async engine / session
    routers/         classic.py, pictos.py — /api/<mode>/{today,guess,reveal}
    services/
      compare.py     per-attribute guess feedback (pure, unit-tested)
      scheduling.py  deterministic on-demand daily-puzzle selection
  data/              JSON seed data + per-mode docs (see server/data/README.md)
  alembic/           database migrations
  scripts/seed.py    sync JSON data into the DB (idempotent)
  tests/             pytest suite
.devcontainer/       Docker Compose dev environment (dev + postgres)
package.json         root scripts that orchestrate client + server
```

## API

All endpoints are under `/api`. Each mode (`classic`, `pictos`) exposes:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/<mode>/today` | Today's puzzle metadata (number, guessable roster) |
| `POST` | `/api/<mode>/guess` | Submit a guess; returns per-attribute feedback |
| `POST` | `/api/<mode>/reveal` | Reveal the answer (gated: only after a solve or the guess cap) |
| `GET` | `/api/health` | Liveness check |

In production, FastAPI also serves the built SPA from `client/dist` — any non-`/api`
path falls back to `index.html` so client-side routes work on direct navigation.

## Getting started

The repo ships a **Dev Container** (Docker Compose: a dev container + Postgres).
In VS Code, run **"Dev Containers: Reopen in Container."** `postCreateCommand`
installs the JS and Python dependencies, and `DATABASE_URL` / `CORS_ORIGINS` are
injected automatically.

Once inside the container, set up the database and start both servers:

```bash
# 1. Apply migrations, then load the seed data
cd server && uv run alembic upgrade head && cd ..
npm run seed

# 2. Run the frontend (Vite :3001) and backend (FastAPI :8001) together
npm run dev
```

Open **http://localhost:3001**. Vite proxies `/api` to the backend on `:8001`.

> Running without the dev container: you'll need Node 22, Python 3.12 + uv, and a
> Postgres instance, with `DATABASE_URL` pointing at it (e.g.
> `postgresql+asyncpg://postgres:postgres@localhost:5432/expedition33dle`).

## Scripts (repo root)

| Command | Description |
|---|---|
| `npm run dev` | Run backend + frontend together (via `concurrently`) |
| `npm run server` | Backend only — Uvicorn with reload on `:8001` |
| `npm run client` | Frontend only — Vite dev server on `:3001` |
| `npm run seed` | Sync `server/data/*.json` into the DB (idempotent) |
| `npm run build` | Production build of the client into `client/dist` |
| `npm start` | Run the backend without reload (serves the built SPA) |

## Daily puzzle

The daily answer is **not stored** — `app/services/scheduling.py` computes it on
demand as a pure function of (date, sorted roster, `SHUFFLE_SEED`, and a per-mode
salt). `puzzle_number` is `(date − LAUNCH_DATE).days + 1`. Because selection is
derived from the roster and seed, changing either reshuffles the date→answer map
for every day — harmless pre-launch, but treat both as frozen once live. See
[`server/data/README.md`](server/data/README.md) for the full mechanic and the
seeding model.

## Testing

```bash
cd server && uv run pytest      # backend: feedback, scheduling, endpoints
cd client && npm test           # frontend: Vitest + Testing Library
```

## License

[MIT](LICENSE). This is a fan-made project, not affiliated with or endorsed by the
creators of Clair Obscur: Expedition 33. Game data is used for identification under
fair use; do not commit ripped game assets.
