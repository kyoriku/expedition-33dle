from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Entity, Puzzle
from app.schemas import EntityRead, TodayResponse

router = APIRouter(prefix="/api", tags=["puzzles"])


@router.get("/today", response_model=TodayResponse)
async def today(db: AsyncSession = Depends(get_db)) -> TodayResponse:
    """Return today's puzzle metadata plus the full entity list.

    The answer entity is never singled out in the response. A 404 with a
    structured detail is returned when no puzzle is scheduled for today.
    """
    today_date = datetime.now(timezone.utc).date()

    puzzle = await db.scalar(
        select(Puzzle).where(Puzzle.puzzle_date == today_date)
    )
    if puzzle is None:
        raise HTTPException(
            status_code=404,
            detail=f"No puzzle scheduled for {today_date.isoformat()}",
        )

    entities = (await db.scalars(select(Entity).order_by(Entity.name))).all()

    return TodayResponse(
        puzzle_date=puzzle.puzzle_date,
        puzzle_number=puzzle.puzzle_number,
        entities=[EntityRead.model_validate(e) for e in entities],
    )
