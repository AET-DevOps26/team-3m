from fastapi import APIRouter
from fastapi.responses import PlainTextResponse

router = APIRouter()


@router.get("/health/liveness", response_class=PlainTextResponse)
def liveness() -> str:
    return "up"


@router.get("/health/readiness", response_class=PlainTextResponse)
def readiness() -> str:
    return "up"
