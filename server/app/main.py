from contextlib import asynccontextmanager
from pathlib import Path

import sentry_sdk
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.db import engine
from app.middleware import SecurityHeadersMiddleware
from app.routers import bosses, classic, pictos, weapons
from app.services.scheduling_guard import assert_scheduling_fingerprint
from app.settings import settings

# Sentry — must run before FastAPI() is constructed so the auto-enabled
# Starlette/FastAPI integrations can wrap the app. No DSN → skipped entirely;
# the SDK patches nothing and the app behaves exactly as before.
_sentry_dsn = (settings.sentry_dsn or "").strip()
if _sentry_dsn:
    sentry_sdk.init(
        dsn=_sentry_dsn,
        environment=settings.sentry_environment,
        traces_sample_rate=0,  # errors only — no performance tracing
    )

# Frozen-schedule enforcement — crash at import time, before FastAPI() is
# constructed and before uvicorn binds, so a bad deploy never serves traffic
# and Railway's /api/health check holds the previous deploy (same failure
# property as a malformed Sentry DSN above).
assert_scheduling_fingerprint()

# repo/client/dist — built SPA (absolute, so it resolves regardless of CWD).
CLIENT_DIST = Path(__file__).resolve().parents[2] / "client" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # Cleanly tear down the asyncpg connection pool on shutdown/reload.
    await engine.dispose()


# Docs endpoints closed on purpose: default-open publishing is how /api/_boom
# leaked into the served schema, and nothing consumes /openapi.json (the
# client API layer is hand-written). The schema stays generatable in-process
# via app.openapi(), which the tests use.
app = FastAPI(
    title="Expedition 33dle API",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)
# Middleware wraps the whole ASGI stack, so unlike routes its registration
# order relative to routers/mounts is irrelevant (the catch-all-last rule
# below is about the route table only).
app.add_middleware(SecurityHeadersMiddleware)
app.include_router(classic.router)
app.include_router(pictos.router)
app.include_router(weapons.router)
app.include_router(bosses.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/_boom", include_in_schema=False)
def boom():
    """Sentry pipeline check: raises an unhandled error when armed.

    Without BOOM_ENABLED=1 this responds with the same JSON 404 as any
    unknown /api/ path, and include_in_schema keeps it out of the OpenAPI
    schema (no longer served, but still generatable via app.openapi()),
    so disarmed it is externally indistinguishable from a route that does
    not exist.
    """
    if settings.boom_enabled != "1":
        raise HTTPException(status_code=404, detail="Not found")
    raise RuntimeError("sentry verification boom: /api/_boom was hit")


# Hashed build assets, when a production build exists.
if (CLIENT_DIST / "assets").is_dir():
    app.mount(
        "/assets", StaticFiles(directory=CLIENT_DIST / "assets"), name="assets"
    )


@app.get("/{full_path:path}")
async def spa(full_path: str):
    """Serve the built SPA for any non-API path.

    Registered last, so real /api/* routes match first; an unmatched /api/*
    path still returns a JSON 404 rather than the HTML shell. Top-level static
    files (favicon, og-image, fonts) are served directly; everything else
    falls back to index.html so client-side routes (/privacy, /terms) work on
    direct navigation and refresh.
    """
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")

    candidate = CLIENT_DIST / full_path
    if full_path and candidate.is_file():
        return FileResponse(candidate)

    index = CLIENT_DIST / "index.html"
    if index.is_file():
        return FileResponse(index)
    raise HTTPException(status_code=404, detail="Client build not found")
