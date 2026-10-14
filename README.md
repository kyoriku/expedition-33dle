# Expedition 33dle

A daily guessing game for **Clair Obscur: Expedition 33**. Each day every mode has
one answer, shared by all players and rolled over at midnight UTC. You narrow it
down from per-attribute feedback — green for a match, amber for a partial/close,
and up/down arrows for numeric hints — within a fixed number of guesses.

Live at **[expedition33dle.com](https://expedition33dle.com)** ·
React 19 + TypeScript · FastAPI + Python 3.12 · PostgreSQL · Railway + Cloudflare

**Reading the code**, the short tour, no clone needed:

- [`server/app/services/scheduling.py`](server/app/services/scheduling.py): each day's answer is a
  pure function of the date, the sorted roster, and a fixed seed. There is no puzzles table to leak,
  and no response carries the answer until the game is provably over.
- [`server/app/services/scheduling_guard.py`](server/app/services/scheduling_guard.py): a behavioral
  fingerprint asserted at import. A deploy that would reshuffle past answers crashes before uvicorn
  binds, fails the healthcheck, and the previous release stays live.
- [`server/scripts/seed.py`](server/scripts/seed.py): roster membership behind count and prune gates
  that abort before any write; a tripped gate is tested to issue zero deletes.
- [`server/app/middleware.py`](server/app/middleware.py): pure-ASGI security headers and an
  injection-escaped access log keyed to the real client IP behind Cloudflare.
- [`docs/DEPLOY.md`](docs/DEPLOY.md): the production runbook covering DNS cutover, cache rules, edge
  protection written from observed scanner traffic, and a false-signals table of real incidents, each
  with its authoritative verification command.

![The mode menu at expedition33dle.com](docs/screenshots/expedition33dle-home.png)

## Modes

| Mode | Guess | Roster | Guesses | Data |
|---|---|---|---|---|
| **Classic** | a character | 33 | 6 | [`server/data/characters.md`](server/data/characters.md) |
| **Pictos** | a Picto | 201 | 8 | [`server/data/pictos.md`](server/data/pictos.md) |
| **Weapons** | a weapon | 116 | 8 | [`server/data/weapons.md`](server/data/weapons.md) |
| **Bosses** | a boss | 50 | 7 | [`server/data/bosses.md`](server/data/bosses.md) |

Each mode picks an uncorrelated answer for the same day. The answer is never
stored anywhere — it's computed on demand as a pure function of the date, the
sorted roster, and a fixed seed, which is why roster membership is frozen and
enforced by a gate at deploy time. Full mechanic in
[`server/data/README.md`](server/data/README.md).

![A solved Classic board showing per-attribute feedback](docs/screenshots/expedition33dle-classic.png)

## Tech stack

- **Frontend** — React 19 + TypeScript, Vite, Tailwind CSS v4, React Router, and
  TanStack Query. See [`client/README.md`](client/README.md).
- **Backend** — Python 3.12 + FastAPI (async), SQLAlchemy 2.0, Alembic migrations,
  served by Uvicorn. Managed with [uv](https://docs.astral.sh/uv/). See
  [`server/README.md`](server/README.md).
- **Database** — PostgreSQL 16 (asyncpg driver).

## Architecture

```
client/              React SPA (see client/README.md)
server/              FastAPI backend (see server/README.md)
docs/                deployment runbook (DEPLOY.md) + README screenshots
.devcontainer/       Docker Compose dev environment (dev + postgres)
.github/             CI — tests.yml runs both suites on every push / PR
Dockerfile           2-stage production image: build the SPA, serve it via FastAPI
railway.json         healthcheck + pre-deploy (migrate, then the gated seed)
package.json         root scripts that orchestrate client + server
```

One request path: the SPA calls `/api/...` and FastAPI computes feedback from
Postgres. In production the same FastAPI process serves the built SPA — an
unknown non-`/api` path gets the shell (the client renders its own 404 page),
an unknown `/api/*` path gets a JSON 404. Unhandled server errors report to
Sentry when `SENTRY_DSN` is set, and the auto-generated API docs endpoints are
closed (see [`docs/DEPLOY.md`](docs/DEPLOY.md)).

### API surface

Each mode (`classic`, `pictos`, `weapons`, `bosses`) exposes `GET /today`,
`POST /guess`, and `POST /reveal` under `/api/<mode>/`, plus `GET /api/health`.
The answer never appears in any response until the game is provably over. Full
contract in [`server/README.md`](server/README.md).

## Getting started

The repo ships a **Dev Container** (Docker Compose: a dev container + Postgres).
In VS Code, run **"Dev Containers: Reopen in Container."** `postCreateCommand`
installs the JS and Python dependencies, and `DATABASE_URL` is injected
automatically.

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
| `npm run seed` | Sync `server/data/*.json` into the DB (idempotent; membership gated) |
| `npm run install` | Install the client's JS dependencies |
| `npm run build` | Production build of the client into `client/dist` |
| `npm start` | Run the backend without reload (serves the built SPA) |

## Testing

```bash
cd server && uv run pytest      # feedback, scheduling, endpoints, seed gates, sentry, settings
cd client && npm test           # components, lib logic, pages (Vitest + Testing Library)
```

CI ([`.github/workflows/tests.yml`](.github/workflows/tests.yml)) runs both
suites on every push to `main` and every pull request.

## Deployment

A single Railway service built from the `Dockerfile` — stage 1 builds the SPA,
stage 2 serves the API and the built SPA via Uvicorn — with Postgres alongside
and Cloudflare in front (DNS, edge cache, rate limiting). `railway.json` wires
the `/api/health` healthcheck and a pre-deploy that migrates and then runs the
membership-gated seed. Sentry receives unhandled server errors. The full
runbook — DNS cutover, cache rules, environment variables, verification
rituals — is [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Use and attribution

This repository is source-available for review. It is not licensed for reuse,
redistribution, or deployment.

Clair Obscur: Expedition 33 and all associated characters, artwork, and game data
are the property of Sandfall Interactive and Kepler Interactive. This is an
unofficial, non-commercial fan project with no affiliation to or endorsement by
either. Game data is used for identification under fair use; do not commit ripped
game assets.
