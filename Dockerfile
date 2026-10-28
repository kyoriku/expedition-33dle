# Stage 1: build the SPA. Dist lands at /client/dist.
FROM node:22-alpine AS build
WORKDIR /client
# Dependency manifests first, so npm ci stays cached until they change
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Python runtime serving the API and the built SPA.
# app.main resolves CLIENT_DIST = parents[2] of /app/server/app/main.py
# -> /app/client/dist, so the two COPY destinations below must stay siblings.
FROM python:3.12-slim
# Unbuffered stdout/stderr: seed prints and tracebacks must reach Railway's
# pre-deploy logs in order, not die in a block buffer at container stop.
ENV PYTHONUNBUFFERED=1
COPY --from=ghcr.io/astral-sh/uv:0.11.33 /uv /usr/local/bin/
WORKDIR /app/server

# Dependencies first (cached until pyproject.toml or uv.lock changes),
# then the project itself once the code is copied in.
COPY server/pyproject.toml server/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY server/ ./
RUN uv sync --frozen --no-dev

COPY --from=build /client/dist /app/client/dist

RUN useradd --create-home appuser
USER appuser

# Matches the ${PORT:-8000} fallback in CMD; change both together
EXPOSE 8000

# Runs through sh -c so ${PORT} (injected by Railway) expands; plain JSON form
# has no shell and would pass it to uvicorn as a literal string. The 8000
# fallback covers docker run and kind, where PORT isn't set.
# exec makes uvicorn PID 1 so it receives SIGTERM directly; a shell as PID 1
# won't forward it.
# --no-access-log: AccessLogMiddleware (app/middleware.py) is the request log.
# It shows the real client IP where uvicorn's can only show Railway's internal
# CGNAT peer. Removing the flag means two lines per request; removing the
# middleware means no request log at all.
CMD ["/bin/sh", "-c", "exec /app/server/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --no-access-log"]