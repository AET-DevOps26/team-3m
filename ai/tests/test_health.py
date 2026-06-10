import pytest
from httpx import ASGITransport, AsyncClient

from ai.main import app


@pytest.fixture
def transport() -> ASGITransport:
    return ASGITransport(app=app)


async def test_liveness(transport: ASGITransport) -> None:
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/ai/health/liveness")
    assert response.status_code == 200
    assert response.text == "up"


async def test_readiness(transport: ASGITransport) -> None:
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/ai/health/readiness")
    assert response.status_code == 200
    assert response.text == "up"
