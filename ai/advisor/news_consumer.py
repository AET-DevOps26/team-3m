import asyncio
import hashlib
import json
import logging
import re
from datetime import datetime

import aio_pika
from pydantic import BaseModel, ConfigDict, ValidationError, field_validator, model_validator

from .config import Settings
from .db import session_factory
from .embeddings import EmbeddingProvider, embed_text, resolve_embedding_provider
from .repository import save_news_article

logger = logging.getLogger(__name__)

MAX_NEWS_CHARS = 2000
PREFETCH_COUNT = 10
TRANSIENT_BACKOFF_SECONDS = 2.0

_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_WHITESPACE = re.compile(r"\s+")


class NewsMessage(BaseModel):
    """Deliberately lenient — the aggregator/queue contract is not final yet.

    Unknown fields are tolerated (extra='allow') so a future producer can add fields
    without breaking ingest. The only hard requirement is some text (title or content).
    """

    model_config = ConfigDict(extra="allow")

    schema_version: int = 1
    external_id: str | None = None
    title: str | None = None
    content: str | None = None
    url: str | None = None
    source: str | None = None
    published_at: object | None = None
    symbols: list[str] = []

    @field_validator("symbols", mode="before")
    @classmethod
    def _normalize_symbols(cls, value: object) -> list[str]:
        if not isinstance(value, (list, tuple)):
            return []
        normalized = []
        for item in value:
            symbol = str(item).strip().upper()
            if symbol:
                normalized.append(symbol)
        return normalized

    @model_validator(mode="after")
    def _require_text(self) -> NewsMessage:
        if not (self.title or self.content):
            raise ValueError("news message must contain a title or content")
        return self


def sanitize(value: str) -> str:
    """Strip control chars, collapse whitespace, and cap length for untrusted news text."""
    cleaned = _WHITESPACE.sub(" ", _CONTROL_CHARS.sub("", value)).strip()
    return cleaned[:MAX_NEWS_CHARS]


def _content_hash(title: str, content: str) -> str:
    return hashlib.sha256(f"{title}\n{content}".encode()).hexdigest()


async def _store(provider: EmbeddingProvider, news: NewsMessage, raw: dict) -> None:
    title = sanitize(news.title or "")
    content = sanitize(news.content or "")
    embed_input = f"{title}\n\n{content}".strip()
    embedding = await embed_text(provider, embed_input)
    async with session_factory() as session:
        await save_news_article(
            session,
            external_id=news.external_id,
            content_hash=_content_hash(title, content),
            title=title,
            content=content,
            url=news.url,
            source=news.source,
            symbols=news.symbols,
            published_at=_coerce_datetime(news.published_at),
            embedding=embedding,
            embedding_model=provider.model,
            embedding_dim=len(embedding),
            raw=raw,
        )


def _coerce_datetime(value: object) -> datetime | None:
    if value is None or isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return None


async def handle_message(provider: EmbeddingProvider, message: aio_pika.abc.AbstractIncomingMessage) -> None:
    try:
        payload = json.loads(message.body)
        news = NewsMessage.model_validate(payload)
    except (json.JSONDecodeError, ValidationError, TypeError) as exc:
        # Poison message: it will never parse. Reject without requeue (dead-letters only
        # if the upstream queue is configured with a DLX — that topology is not ours).
        logger.warning("Rejecting unparsable news message: %s", exc)
        await message.reject(requeue=False)
        return

    try:
        await _store(provider, news, payload)
        await message.ack()
    except Exception as exc:
        # Transient (embedding provider / DB). Back off briefly, then requeue.
        logger.error("Transient failure processing news message; requeueing", exc_info=exc)
        await asyncio.sleep(TRANSIENT_BACKOFF_SECONDS)
        await message.nack(requeue=True)


async def run_consumer(settings: Settings) -> None:
    provider = resolve_embedding_provider(settings)
    if provider is None:
        logger.warning("News consumer: no embedding provider configured; ingest disabled")
        return

    connection = await aio_pika.connect_robust(settings.rabbitmq_url)
    async with connection:
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=PREFETCH_COUNT)
        # Passive: the queue/exchange/bindings are owned by the queue service. Fail fast
        # if the queue the aggregator publishes to does not exist yet.
        queue = await channel.declare_queue(settings.news_queue, passive=True)
        logger.info("News consumer: consuming from queue '%s'", settings.news_queue)
        await queue.consume(lambda message: handle_message(provider, message))
        await asyncio.Future()
