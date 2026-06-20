from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.db import engine
from app.routers import classic

# repo/client/dist — built SPA (absolute, so it resolves regardless of CWD).
CLIENT_DIST = Path(__file__).resolve().parents[2] / "client" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # Cleanly tear down the asyncpg connection pool on shutdown/reload.
    await engine.dispose()


app = FastAPI(title="Expedition33dle API", lifespan=lifespan)
app.include_router(classic.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


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
