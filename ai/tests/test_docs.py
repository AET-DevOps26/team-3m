import pytest
from httpx import ASGITransport, AsyncClient

from advisor.main import app


@pytest.fixture
def transport() -> ASGITransport:
    return ASGITransport(app=app)


async def test_swagger_ui_served_under_ai_prefix(transport: ASGITransport) -> None:
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/ai/docs")
    assert response.status_code == 200
    assert "swagger-ui" in response.text


async def test_openapi_spec_served_under_ai_prefix(transport: ASGITransport) -> None:
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/ai/openapi.json")
    assert response.status_code == 200
    assert response.json()["info"]["title"] == "Kontor AI"
