import json
from unittest.mock import AsyncMock, MagicMock

import pytest
from pydantic import ValidationError

from advisor import news_consumer as nc
from advisor.embeddings import EmbeddingProvider


def _provider() -> EmbeddingProvider:
    return EmbeddingProvider(client=MagicMock(), model="test-embed")


def _message(body: bytes) -> AsyncMock:
    message = AsyncMock()
    message.body = body
    return message


class _FakeSession:
    async def __aenter__(self) -> _FakeSession:
        return self

    async def __aexit__(self, *args: object) -> bool:
        return False


# --- NewsMessage parsing -------------------------------------------------------------


def test_news_message_tolerates_unknown_fields() -> None:
    news = nc.NewsMessage.model_validate({"title": "t", "content": "c", "future_field": {"x": 1}})
    assert news.title == "t"


def test_news_message_uppercases_symbols() -> None:
    news = nc.NewsMessage.model_validate({"title": "t", "symbols": ["aapl", " msft ", ""]})
    assert news.symbols == ["AAPL", "MSFT"]


def test_news_message_requires_title_or_content() -> None:
    with pytest.raises(ValidationError):
        nc.NewsMessage.model_validate({"symbols": ["AAPL"]})


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

    news = nc.NewsMessage.model_validate(
        {"title": " Big   News ", "content": "x" * 3000, "symbols": ["aapl"], "external_id": "e1"}
    )
    await nc._store(_provider(), news, {"raw": True})

    assert saved["embedding"] == [0.1, 0.2, 0.3]
    assert saved["embedding_dim"] == 3
    assert saved["embedding_model"] == "test-embed"
    assert saved["symbols"] == ["AAPL"]
    assert saved["title"] == "Big News"
    assert len(saved["content"]) <= nc.MAX_NEWS_CHARS
    assert saved["external_id"] == "e1"
    assert saved["content_hash"]


# --- handle_message ------------------------------------------------------------------


async def test_handle_message_acks_after_store(monkeypatch: pytest.MonkeyPatch) -> None:
    store_mock = AsyncMock()
    monkeypatch.setattr(nc, "_store", store_mock)
    message = _message(json.dumps({"title": "t", "content": "c"}).encode())

    await nc.handle_message(_provider(), message)

    store_mock.assert_awaited_once()
    message.ack.assert_awaited_once()
    message.nack.assert_not_awaited()
    message.reject.assert_not_awaited()


async def test_handle_message_rejects_invalid_json_as_poison() -> None:
    message = _message(b"{not valid json")

    await nc.handle_message(_provider(), message)

    message.reject.assert_awaited_once_with(requeue=False)
    message.ack.assert_not_awaited()


async def test_handle_message_rejects_message_without_text_as_poison() -> None:
    message = _message(json.dumps({"symbols": ["AAPL"]}).encode())

    await nc.handle_message(_provider(), message)

    message.reject.assert_awaited_once_with(requeue=False)
    message.ack.assert_not_awaited()


async def test_handle_message_requeues_on_transient_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(nc, "_store", AsyncMock(side_effect=RuntimeError("db down")))
    monkeypatch.setattr(nc.asyncio, "sleep", AsyncMock())
    message = _message(json.dumps({"title": "t", "content": "c"}).encode())

    await nc.handle_message(_provider(), message)

    message.nack.assert_awaited_once_with(requeue=True)
    message.ack.assert_not_awaited()
    message.reject.assert_not_awaited()
