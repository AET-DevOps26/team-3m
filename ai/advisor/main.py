from fastapi import FastAPI

from .health import router as health_router

app = FastAPI(title="Kontor AI")
app.include_router(health_router, prefix="/ai")
