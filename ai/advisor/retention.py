import asyncio
import logging
from datetime import UTC, datetime, timedelta

from .config import Settings
from .db import session_factory
from .repository import delete_news_older_than

logger = logging.getLogger(__name__)


async def run_retention_sweeper(settings: Settings) -> None:
    """Periodically delete news articles older than NEWS_RETENTION_DAYS so ingest can't exhaust
    the shared DB and take recommendation persistence down with it. Runs independently of ingest;
    a sweep failure is logged and retried next interval, never propagated to the API."""
    if settings.news_retention_days <= 0:
        logger.info("News retention sweeper disabled (news_retention_days <= 0)")
        return
    while True:
        cutoff = datetime.now(UTC) - timedelta(days=settings.news_retention_days)
        try:
            async with session_factory() as session:
                removed = await delete_news_older_than(session, cutoff)
            if removed:
                logger.info("Retention sweep removed %d news article(s) older than %s", removed, cutoff.isoformat())
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.error("News retention sweep failed; retrying next interval", exc_info=exc)
        await asyncio.sleep(settings.news_retention_sweep_interval_seconds)
