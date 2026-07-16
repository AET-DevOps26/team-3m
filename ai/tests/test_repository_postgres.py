"""Integration tests for the Postgres-only repository paths (ON CONFLICT upsert, the
jsonb symbol query, cosine-distance ordering, and retention eviction). These never run
against SQLite, so they exercise a real pgvector Postgres pointed at by ``TEST_DATABASE_URL``
(the CI service container). The module skips when that variable is unset."""

import os
from collections.abc import AsyncIterator
from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from advisor.models import Base
from advisor.repository import delete_news_older_than, find_relevant_news, save_news_article


@pytest.fixture(scope="module")
def pg_url() -> str:
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        pytest.skip("TEST_DATABASE_URL not set; skipping Postgres integration tests")
    return url


@pytest.fixture
async def pg_sessions(pg_url: str) -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine(pg_url)
    async with engine.begin() as conn:
        await conn.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS vector")
        await conn.run_sync(Base.metadata.create_all)
    try:
        yield async_sessionmaker(engine, expire_on_commit=False)
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await engine.dispose()


def _article(**overrides: object) -> dict:
    values: dict = {
        "external_id": None,
        "title": "Apple earnings beat",
        "content": "AAPL reported strong quarterly results",
        "url": None,
        "source": "reuters",
        "symbols": ["AAPL"],
        "published_at": datetime(2026, 7, 14, tzinfo=UTC),
        "embedding": [0.1, 0.2, 0.3],
        "embedding_model": "test-embed",
        "embedding_dim": 3,
        "raw": None,
    }
    values.update(overrides)
    return values


async def test_upsert_is_idempotent_on_content_hash(pg_sessions: async_sessionmaker[AsyncSession]) -> None:
    async with pg_sessions() as session:
        await save_news_article(session, content_hash="h1", **_article())
        await save_news_article(session, content_hash="h1", **_article(embedding=[0.9, 0.9, 0.9]))
    async with pg_sessions() as session:
        rows = await find_relevant_news(session, symbols=["AAPL"], query_embedding=None, embedding_model=None)
    assert len(rows) == 1
    assert list(rows[0].embedding) == pytest.approx([0.1, 0.2, 0.3])


async def test_symbol_and_semantic_paths_run_on_postgres(pg_sessions: async_sessionmaker[AsyncSession]) -> None:
    async with pg_sessions() as session:
        await save_news_article(session, content_hash="aapl", **_article(symbols=["AAPL"], embedding=[1.0, 0.0, 0.0]))
        await save_news_article(
            session,
            content_hash="msft",
            **_article(
                symbols=["MSFT"],
                embedding=[0.0, 1.0, 0.0],
                title="Microsoft cloud grows",
                content="MSFT azure revenue up",
            ),
        )
    async with pg_sessions() as session:
        by_symbol = await find_relevant_news(session, symbols=["MSFT"], query_embedding=None, embedding_model=None)
        by_vector = await find_relevant_news(
            session, symbols=[], query_embedding=[1.0, 0.0, 0.0], embedding_model="test-embed"
        )
    assert [a.content_hash for a in by_symbol] == ["msft"]
    assert by_vector[0].content_hash == "aapl"


async def test_delete_news_older_than_respects_cutoff(pg_sessions: async_sessionmaker[AsyncSession]) -> None:
    async with pg_sessions() as session:
        await save_news_article(session, content_hash="keep", **_article())
    async with pg_sessions() as session:
        removed_past = await delete_news_older_than(session, datetime(2000, 1, 1, tzinfo=UTC))
    async with pg_sessions() as session:
        removed_future = await delete_news_older_than(session, datetime(2999, 1, 1, tzinfo=UTC))
    assert removed_past == 0
    assert removed_future == 1
