from fastapi import FastAPI, APIRouter

app = FastAPI(title="Expedition33dle API")

api = APIRouter(prefix="/api")

@api.get("/today")
def today():
    # TODO: read today's puzzle from the DB
    return {"date": "2026-05-20", "answer": "placeholder"}

app.include_router(api)

@app.get("/")
def root():
    return {"status": "ok"}
