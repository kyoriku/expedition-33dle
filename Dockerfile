# Stage 1 — build the SPA. Dist lands at /client/dist.
FROM node:22-alpine AS build
WORKDIR /client
COPY client/ .
RUN npm ci && npm run build

# Stage 2 — Python runtime serving API + the built SPA.
# app.main resolves CLIENT_DIST = parents[2] of /app/server/app/main.py
# -> /app/client/dist, so the two COPY destinations below must stay siblings.
FROM python:3.12-slim
# Unbuffered stdout/stderr: seed prints and tracebacks must reach Railway's
# pre-deploy logs in order, not die in a block buffer at container stop.
ENV PYTHONUNBUFFERED=1
COPY --from=ghcr.io/astral-sh/uv:0.11.33 /uv /usr/local/bin/
COPY server/ /app/server
WORKDIR /app/server
RUN uv sync --frozen --no-dev
COPY --from=build /client/dist /app/client/dist

# Shell form on purpose: exec form has no shell, so ${PORT} (injected by
# Railway) would be passed to uvicorn as a literal string. --no-sync: the venv
# was fully built above; without it, `uv run` re-syncs at every container
# start — adding the dev group and a network dependency at boot.
CMD uv run --no-sync uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
