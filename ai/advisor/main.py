from fastapi import FastAPI

from .health import router as health_router
from .recommendation import router as recommendation_router

app = FastAPI(title="Kontor AI", docs_url="/ai/docs", redoc_url=None, openapi_url="/ai/openapi.json")
app.include_router(health_router, prefix="/ai")
app.include_router(recommendation_router, prefix="/ai")
