from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .db import get_session

router = APIRouter()


@router.get("/health/liveness", response_class=PlainTextResponse)
def liveness() -> str:
    return "up"


@router.get("/health/readiness", response_class=PlainTextResponse)
async def readiness(session: Annotated[AsyncSession, Depends(get_session)]) -> str:
    try:
        await session.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not reachable",
        ) from exc
    return "up"
