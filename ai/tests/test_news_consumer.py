import json
from datetime import UTC, datetime
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest
from aio_pika.exceptions import PublishError
from pamqp.commands import Basic
from pydantic import ValidationError

from advisor import news_consumer as nc
from advisor.config import Settings
from advisor.embeddings import EmbeddingProvider

CONTRACT_EXAMPLE = Path(__file__).parents[2] / "news/docs/examples/article-crawled.json"
PRODUCER_MESSAGE = json.loads(CONTRACT_EXAMPLE.read_text())


def _provider() -> EmbeddingProvider:
    return EmbeddingProvider(client=MagicMock(), model="test-embed")


def _message(body: bytes) -> AsyncMock:
    message = AsyncMock()
    message.body = body
    message.redelivered = False
    return message


def _exchange() -> MagicMock:
    exchange = MagicMock()
    exchange.publish = AsyncMock(return_value=Basic.Ack(delivery_tag=1))
    return exchange


class _FakeSession:
    async def __aenter__(self) -> _FakeSession:
        return self

    async def __aexit__(self, *args: object) -> bool:
        return False


# --- NewsMessage parsing -------------------------------------------------------------


def test_news_message_tolerates_unknown_fields() -> None:
    news = nc.NewsMessage.model_validate({**PRODUCER_MESSAGE, "futureField": {"x": 1}})

    assert news.title == PRODUCER_MESSAGE["title"]


def test_news_message_maps_asyncapi_contract() -> None:
    news = nc.NewsMessage.model_validate(PRODUCER_MESSAGE)

    assert news.id == PRODUCER_MESSAGE["id"]
    assert news.content_text == PRODUCER_MESSAGE["contentText"]
    assert news.published_at == datetime(2026, 7, 14, 8, 30, tzinfo=UTC)
    assert news.fetched_at == datetime(2026, 7, 14, 8, 35, tzinfo=UTC)


def test_news_message_requires_complete_producer_contract() -> None:
    with pytest.raises(ValidationError):
        nc.NewsMessage.model_validate({"title": "Incomplete"})


# --- helpers -------------------------------------------------------------------------


def test_sanitize_strips_control_chars_collapses_and_truncates() -> None:
    dirty = "Break\x00ing\t\tnews\n\n" + "x" * 5000
    clean = nc.sanitize(dirty)
    assert "\x00" not in clean
    assert "  " not in clean
    assert clean.startswith("Breaking news ")
    assert len(clean) <= nc.MAX_NEWS_CHARS


def test_content_hash_is_deterministic_and_content_sensitive() -> None:
    # Same title+content (identical redelivery) -> same dedupe key.
    assert nc._content_hash("t", "c") == nc._content_hash("t", "c")
    assert nc._content_hash("t", "c") != nc._content_hash("t", "different")


# --- _store --------------------------------------------------------------------------


async def test_store_embeds_and_saves_sanitized(monkeypatch: pytest.MonkeyPatch) -> None:
    saved: dict = {}

    async def fake_save(session: object, **kwargs: object) -> None:
        saved.update(kwargs)

    monkeypatch.setattr(nc, "save_news_article", fake_save)
    monkeypatch.setattr(nc, "embed_text", AsyncMock(return_value=[0.1, 0.2, 0.3]))
    monkeypatch.setattr(nc, "session_factory", lambda: _FakeSession())

    news = nc.NewsMessage.model_validate({**PRODUCER_MESSAGE, "title": " Big   News ", "contentText": "x" * 3000})
    await nc._store(_provider(), news, {"raw": True})

    assert saved["embedding"] == [0.1, 0.2, 0.3]
    assert saved["embedding_dim"] == 3
    assert saved["embedding_model"] == "test-embed"
    assert saved["symbols"] == []
    assert saved["title"] == "Big News"
    assert len(saved["content"]) <= nc.MAX_NEWS_CHARS
    assert saved["external_id"] == PRODUCER_MESSAGE["id"]
    assert saved["published_at"] == datetime(2026, 7, 14, 8, 30, tzinfo=UTC)
    assert saved["content_hash"]


async def test_store_uses_summary_when_full_text_is_unavailable(monkeypatch: pytest.MonkeyPatch) -> None:
    saved: dict = {}

    async def fake_save(session: object, **kwargs: object) -> None:
        saved.update(kwargs)

    monkeypatch.setattr(nc, "save_news_article", fake_save)
    monkeypatch.setattr(nc, "embed_text", AsyncMock(return_value=[0.1, 0.2, 0.3]))
    monkeypatch.setattr(nc, "session_factory", lambda: _FakeSession())
    news = nc.NewsMessage.model_validate({**PRODUCER_MESSAGE, "contentText": None})

    await nc._store(_provider(), news, {"raw": True})

    assert saved["content"] == PRODUCER_MESSAGE["summary"]


# --- handle_message ------------------------------------------------------------------


async def test_handle_message_acks_after_store(monkeypatch: pytest.MonkeyPatch) -> None:
    store_mock = AsyncMock()
    monkeypatch.setattr(nc, "_store", store_mock)
    message = _message(json.dumps(PRODUCER_MESSAGE).encode())
    exchange = _exchange()

    await nc.handle_message(_provider(), message, exchange, "dead.route")

    store_mock.assert_awaited_once()
    message.ack.assert_awaited_once()
    message.nack.assert_not_awaited()
    message.reject.assert_not_awaited()
    exchange.publish.assert_not_awaited()


async def test_handle_message_dead_letters_invalid_json_as_poison() -> None:
    message = _message(b"{not valid json")
    exchange = _exchange()

    await nc.handle_message(_provider(), message, exchange, "dead.route")

    exchange.publish.assert_awaited_once()
    assert exchange.publish.await_args.kwargs["routing_key"] == "dead.route"
    message.ack.assert_awaited_once()
    message.reject.assert_not_awaited()


async def test_handle_message_dead_letters_invalid_utf8_as_poison() -> None:
    message = _message(b'\xff{"title":"invalid encoding"}')
    exchange = _exchange()

    await nc.handle_message(_provider(), message, exchange, "dead.route")

    exchange.publish.assert_awaited_once()
    message.ack.assert_awaited_once()
    message.reject.assert_not_awaited()


async def test_handle_message_dead_letters_incomplete_contract_as_poison() -> None:
    message = _message(json.dumps({"title": "Incomplete"}).encode())
    exchange = _exchange()

    await nc.handle_message(_provider(), message, exchange, "dead.route")

    exchange.publish.assert_awaited_once()
    message.ack.assert_awaited_once()
    message.reject.assert_not_awaited()


async def test_handle_message_requeues_on_transient_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(nc, "_store", AsyncMock(side_effect=RuntimeError("db down")))
    monkeypatch.setattr(nc.asyncio, "sleep", AsyncMock())
    message = _message(json.dumps(PRODUCER_MESSAGE).encode())
    exchange = _exchange()

    await nc.handle_message(_provider(), message, exchange, "dead.route")

    message.nack.assert_awaited_once_with(requeue=True)
    message.ack.assert_not_awaited()
    message.reject.assert_not_awaited()
    exchange.publish.assert_not_awaited()


async def test_handle_message_dead_letters_failure_after_redelivery(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(nc, "_store", AsyncMock(side_effect=RuntimeError("permanent provider error")))
    message = _message(json.dumps(PRODUCER_MESSAGE).encode())
    message.redelivered = True
    exchange = _exchange()

    await nc.handle_message(_provider(), message, exchange, "dead.route")

    exchange.publish.assert_awaited_once()
    message.nack.assert_not_awaited()
    message.ack.assert_awaited_once()
    message.reject.assert_not_awaited()


async def test_dead_letter_requeues_when_mandatory_publish_is_returned() -> None:
    message = _message(json.dumps(PRODUCER_MESSAGE).encode())
    exchange = _exchange()
    returned = MagicMock()
    returned.delivery = Basic.Return(
        reply_code=312,
        reply_text="NO_ROUTE",
        exchange="kontor.news.dlx",
        routing_key="dead.route",
    )
    exchange.publish.side_effect = PublishError(returned, Basic.Ack(delivery_tag=1))

    await nc._dead_letter(message, exchange, "dead.route", "processing-failed")

    message.nack.assert_awaited_once_with(requeue=True)
    message.ack.assert_not_awaited()


async def test_connect_to_broker_uses_discrete_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    connect = AsyncMock(return_value="connection")
    monkeypatch.setattr(nc.aio_pika, "connect_robust", connect)
    settings = Settings(
        rabbitmq_host="rabbitmq",
        rabbitmq_port=5673,
        rabbitmq_username="consumer",
        rabbitmq_password="secret:/@",
    )

    connection = await nc._connect_to_broker(settings)

    assert connection == "connection"
    connect.assert_awaited_once_with(host="rabbitmq", port=5673, login="consumer", password="secret:/@")


async def test_connect_to_broker_prefers_explicit_url(monkeypatch: pytest.MonkeyPatch) -> None:
    connect = AsyncMock(return_value="connection")
    monkeypatch.setattr(nc.aio_pika, "connect_robust", connect)
    settings = Settings(
        rabbitmq_url="amqps://consumer:secret@broker.example/kontor",
        rabbitmq_host="ignored",
    )

    await nc._connect_to_broker(settings)

    connect.assert_awaited_once_with("amqps://consumer:secret@broker.example/kontor")


async def test_open_channel_raises_for_unroutable_mandatory_publish() -> None:
    connection = MagicMock()
    connection.channel = AsyncMock(return_value="channel")

    channel = await nc._open_channel(connection)

    assert channel == "channel"
    connection.channel.assert_awaited_once_with(publisher_confirms=True, on_return_raises=True)


# --- ingest metrics ------------------------------------------------------------------


def _capture_metrics(monkeypatch: pytest.MonkeyPatch) -> MagicMock:
    captured = MagicMock()
    monkeypatch.setattr(nc, "news_ingest_metrics", captured)
    return captured


async def test_handle_message_records_stored_outcome(monkeypatch: pytest.MonkeyPatch) -> None:
    captured = _capture_metrics(monkeypatch)
    monkeypatch.setattr(nc, "_store", AsyncMock())

    await nc.handle_message(_provider(), _message(json.dumps(PRODUCER_MESSAGE).encode()), _exchange(), "dead.route")

    captured.record_consumed.assert_called_once_with(nc.OUTCOME_STORED)


async def test_handle_message_records_invalid_outcome(monkeypatch: pytest.MonkeyPatch) -> None:
    captured = _capture_metrics(monkeypatch)

    await nc.handle_message(_provider(), _message(b"{not valid json"), _exchange(), "dead.route")

    captured.record_consumed.assert_called_once_with(nc.OUTCOME_INVALID)


async def test_handle_message_records_retried_when_dead_letter_publish_fails(monkeypatch: pytest.MonkeyPatch) -> None:
    captured = _capture_metrics(monkeypatch)
    monkeypatch.setattr(nc.asyncio, "sleep", AsyncMock())
    exchange = MagicMock()
    exchange.publish = AsyncMock(side_effect=RuntimeError("broker gone"))

    await nc.handle_message(_provider(), _message(b"{not valid json"), exchange, "dead.route")

    captured.record_consumed.assert_called_once_with(nc.OUTCOME_RETRIED)


async def test_handle_message_records_retried_then_dead_lettered(monkeypatch: pytest.MonkeyPatch) -> None:
    captured = _capture_metrics(monkeypatch)
    monkeypatch.setattr(nc, "_store", AsyncMock(side_effect=RuntimeError("boom")))
    monkeypatch.setattr(nc.asyncio, "sleep", AsyncMock())

    first_delivery = _message(json.dumps(PRODUCER_MESSAGE).encode())
    await nc.handle_message(_provider(), first_delivery, _exchange(), "dead.route")

    redelivery = _message(json.dumps(PRODUCER_MESSAGE).encode())
    redelivery.redelivered = True
    await nc.handle_message(_provider(), redelivery, _exchange(), "dead.route")

    assert [call.args[0] for call in captured.record_consumed.call_args_list] == [
        nc.OUTCOME_RETRIED,
        nc.OUTCOME_DEAD_LETTERED,
    ]


async def test_store_records_embedding_duration(monkeypatch: pytest.MonkeyPatch) -> None:
    captured = _capture_metrics(monkeypatch)
    monkeypatch.setattr(nc, "save_news_article", AsyncMock())
    monkeypatch.setattr(nc, "embed_text", AsyncMock(return_value=[0.1]))
    monkeypatch.setattr(nc, "session_factory", lambda: _FakeSession())
    news = nc.NewsMessage.model_validate(PRODUCER_MESSAGE)

    await nc._store(_provider(), news, {"raw": True})

    captured.record_embedding_duration.assert_called_once()
    seconds = captured.record_embedding_duration.call_args.args[0]
    assert seconds >= 0
    assert captured.record_embedding_duration.call_args.kwargs["model"] == "test-embed"
