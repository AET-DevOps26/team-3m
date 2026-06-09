from fastapi import APIRouter
from pydantic import BaseModel


class HealthStatus(BaseModel):
    status: str


router = APIRouter()


@router.get("/health/liveness", response_model=HealthStatus)
def liveness() -> HealthStatus:
    return HealthStatus(status="up")


@router.get("/health/readiness", response_model=HealthStatus)
def readiness() -> HealthStatus:
    return HealthStatus(status="up")
