from fastapi import FastAPI

from .health import router as health_router
from .recommendation import router as recommendation_router

app = FastAPI(title="Kontor AI")
app.include_router(health_router, prefix="/ai")
app.include_router(recommendation_router, prefix="/ai")
