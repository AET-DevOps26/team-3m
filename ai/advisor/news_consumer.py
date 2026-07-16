import asyncio
import hashlib
import json
import logging
import re
from datetime import datetime

import aio_pika
from pydantic import BaseModel, ConfigDict, Field, ValidationError

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
    """Consumer view of the producer-owned contract in ``news/docs/asyncapi.yml``."""

    model_config = ConfigDict(extra="ignore", frozen=True)

    id: str = Field(min_length=64, max_length=64)
    source: str = Field(min_length=1)
    feed_url: str = Field(alias="feedUrl", min_length=1)
    url: str = Field(min_length=1)
    title: str = Field(min_length=1)
    summary: str | None = None
    content_text: str | None = Field(default=None, alias="contentText")
    published_at: datetime | None = Field(default=None, alias="publishedAt")
    fetched_at: datetime = Field(alias="fetchedAt")


def sanitize(value: str) -> str:
    """Strip control chars, collapse whitespace, and cap length for untrusted news text."""
    cleaned = _WHITESPACE.sub(" ", _CONTROL_CHARS.sub("", value)).strip()
    return cleaned[:MAX_NEWS_CHARS]


def _content_hash(title: str, content: str) -> str:
    return hashlib.sha256(f"{title}\n{content}".encode()).hexdigest()


async def _store(provider: EmbeddingProvider, news: NewsMessage, raw: dict) -> None:
    title = sanitize(news.title)
    content = sanitize(news.content_text or news.summary or "")
    embed_input = f"{title}\n\n{content}".strip()
    embedding = await embed_text(provider, embed_input)
    async with session_factory() as session:
        await save_news_article(
            session,
            external_id=news.id,
            content_hash=_content_hash(title, content),
            title=title,
            content=content,
            url=news.url,
            source=news.source,
            symbols=[],
            published_at=news.published_at,
            embedding=embedding,
            embedding_model=provider.model,
            embedding_dim=len(embedding),
            raw=raw,
        )


async def _dead_letter(
    message: aio_pika.abc.AbstractIncomingMessage,
    exchange: aio_pika.abc.AbstractExchange,
    routing_key: str,
    reason: str,
) -> None:
    dead_letter = aio_pika.Message(
        body=message.body,
        content_type="application/json",
        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        headers={"x-kontor-dead-letter-reason": reason},
    )
    try:
        confirmation = await exchange.publish(dead_letter, routing_key=routing_key, mandatory=True)
        if confirmation is None or getattr(confirmation, "name", None) != "Basic.Ack":
            raise RuntimeError("dead-letter publish was not confirmed")
    except Exception as exc:
        logger.error("Failed to publish news message to dead-letter queue; requeueing", exc_info=exc)
        # ponytail: a persistently unroutable DLX hot-loops (parse-fail -> DLX-fail -> requeue),
        # bounded only by this sleep. Add a redelivery cap / alert if the DLX can stay broken.
        await asyncio.sleep(TRANSIENT_BACKOFF_SECONDS)
        await message.nack(requeue=True)
        return
    await message.ack()


async def handle_message(
    provider: EmbeddingProvider,
    message: aio_pika.abc.AbstractIncomingMessage,
    dead_letter_exchange: aio_pika.abc.AbstractExchange,
    dead_letter_routing_key: str,
) -> None:
    try:
        payload = json.loads(message.body)
        news = NewsMessage.model_validate(payload)
    except (json.JSONDecodeError, UnicodeDecodeError, ValidationError, TypeError) as exc:
        logger.warning("Dead-lettering unparsable news message: %s", exc)
        await _dead_letter(message, dead_letter_exchange, dead_letter_routing_key, "invalid-message")
        return

    try:
        await _store(provider, news, payload)
        await message.ack()
    except Exception as exc:
        # ponytail: `redelivered` doubles as our retry counter, but connect_robust also sets it after
        # a connection drop, so an in-flight message during an infra blip is dead-lettered (to the
        # DLQ, not lost) rather than retried. Switch to a quorum queue's x-delivery-count if the
        # producer adopts one.
        if message.redelivered:
            logger.error("News message failed after redelivery; dead-lettering", exc_info=exc)
            await _dead_letter(message, dead_letter_exchange, dead_letter_routing_key, "processing-failed")
            return
        logger.error("News message processing failed; retrying once", exc_info=exc)
        await asyncio.sleep(TRANSIENT_BACKOFF_SECONDS)
        await message.nack(requeue=True)


async def _connect_to_broker(settings: Settings) -> aio_pika.abc.AbstractRobustConnection:
    if settings.rabbitmq_url:
        return await aio_pika.connect_robust(settings.rabbitmq_url)
    return await aio_pika.connect_robust(
        host=settings.rabbitmq_host,
        port=settings.rabbitmq_port,
        login=settings.rabbitmq_username,
        password=settings.rabbitmq_password,
    )


async def _open_channel(connection: aio_pika.abc.AbstractRobustConnection) -> aio_pika.abc.AbstractChannel:
    return await connection.channel(publisher_confirms=True, on_return_raises=True)


async def run_consumer(settings: Settings) -> None:
    provider = resolve_embedding_provider(settings)
    if provider is None:
        logger.warning("News consumer: no embedding provider configured; ingest disabled")
        return

    connection = await _connect_to_broker(settings)
    async with connection:
        channel = await _open_channel(connection)
        await channel.set_qos(prefetch_count=PREFETCH_COUNT)
        # Passive: the queues/exchanges/bindings are owned by the news service. Fail fast
        # if the producer topology does not exist yet.
        queue = await channel.declare_queue(settings.news_queue, passive=True)
        dead_letter_exchange = await channel.get_exchange(settings.news_dead_letter_exchange, ensure=True)
        logger.info("News consumer: consuming from queue '%s'", settings.news_queue)
        await queue.consume(
            lambda message: handle_message(
                provider,
                message,
                dead_letter_exchange,
                settings.news_dead_letter_routing_key,
            )
        )
        await asyncio.Future()
