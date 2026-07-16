import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .config import get_settings
from .health import router as health_router
from .news_consumer import run_consumer
from .recommendation import router as recommendation_router
from .retention import run_retention_sweeper

logger = logging.getLogger(__name__)

CONSUMER_RESTART_BACKOFF_SECONDS = 5.0


async def _supervise_consumer() -> None:
    """Keep the news consumer alive; restart on unexpected exit. A news-ingest fault must
    never take down the recommendation API, so failures are logged, not propagated."""
    settings = get_settings()
    while True:
        try:
            await run_consumer(settings)
            # A clean return means the consumer is disabled (no provider); stop supervising.
            return
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.error("News consumer crashed; restarting after backoff", exc_info=exc)
            await asyncio.sleep(CONSUMER_RESTART_BACKOFF_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    tasks: list[asyncio.Task] = []
    settings = get_settings()
    if settings.is_news_consumer_configured:
        tasks.append(asyncio.create_task(_supervise_consumer()))
        tasks.append(asyncio.create_task(run_retention_sweeper(settings)))
    try:
        yield
    finally:
        for task in tasks:
            task.cancel()
        for task in tasks:
            try:
                await task
            except asyncio.CancelledError:
                pass


app = FastAPI(
    title="Kontor AI",
    lifespan=lifespan,
    docs_url="/ai/docs",
    redoc_url=None,
    openapi_url="/ai/openapi.json",
)
app.include_router(health_router, prefix="/ai")
app.include_router(recommendation_router, prefix="/ai")
