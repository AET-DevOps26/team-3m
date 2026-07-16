from collections.abc import AsyncIterator, Iterator
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from advisor.db import get_session
from advisor.main import app
from advisor.models import Base


@pytest.fixture(autouse=True)
async def db() -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override() -> AsyncIterator[AsyncSession]:
        async with factory() as session:
            yield session

    app.dependency_overrides[get_session] = override
    yield factory
    app.dependency_overrides.pop(get_session, None)
    await engine.dispose()


@pytest.fixture(autouse=True)
def news_disabled() -> Iterator[None]:
    """News RAG is best-effort and off by default in tests (no embedding network calls,
    no pgvector). News-specific tests patch `_retrieve_news` themselves to opt in."""
    with patch("advisor.recommendation._retrieve_news", new=AsyncMock(return_value=[])):
        yield
