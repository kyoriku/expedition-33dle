from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.db import engine
from app.routers import puzzles


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # Cleanly tear down the asyncpg connection pool on shutdown/reload.
    await engine.dispose()


app = FastAPI(title="Expedition33dle API", lifespan=lifespan)
app.include_router(puzzles.router)


@app.get("/")
def root():
    return {"status": "ok"}
