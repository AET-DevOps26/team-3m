import json
from collections.abc import Generator
from typing import cast
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from advisor.auth import require_authenticated_user
from advisor.config import Settings, get_settings
from advisor.llm import LlmProvider
from advisor.main import app
from advisor.recommendation import LLMRecommendation

SAMPLE_PORTFOLIO = {
    "holdings": [
        {
            "symbol": "AAPL",
            "name": "Apple Inc.",
            "asset_class": "STOCK",
            "shares": 10.0,
            "current_value": 1500.0,
            "currency": "USD",
        }
    ],
    "cash_balance": 500.0,
    "total_value": 2000.0,
    "currency": "USD",
    "risk_tolerance": "MODERATE",
}


@pytest.fixture
def transport() -> ASGITransport:
    return ASGITransport(app=app)


@pytest.fixture
def authenticated() -> Generator[None]:
    app.dependency_overrides[require_authenticated_user] = lambda: "test-user"
    yield
    app.dependency_overrides.pop(require_authenticated_user, None)


@pytest.fixture
def not_configured(authenticated: None) -> Generator[None]:
    """No Logos key and no local LLM base URL → the AI service is unconfigured."""
    app.dependency_overrides[get_settings] = lambda: Settings(logos_api_key="", local_llm_base_url="")
    yield
    app.dependency_overrides.pop(get_settings, None)


async def test_recommendation_requires_authentication(transport: ASGITransport) -> None:
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/ai/advisor/recommendation", json=SAMPLE_PORTFOLIO)
    assert response.status_code == 401


async def test_recommendation_returns_503_when_not_configured(transport: ASGITransport, not_configured: None) -> None:
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/ai/advisor/recommendation", json=SAMPLE_PORTFOLIO)
    assert response.status_code == 503


async def test_recommendation_returns_structured_response(transport: ASGITransport, authenticated: None) -> None:
    mock_llm = LLMRecommendation(
        recommendation="Consider diversifying into bonds.",
        rationale="Your portfolio is heavily weighted in equities.",
    )

    with patch("advisor.recommendation.resolve_llm_provider") as mock_resolve:
        mock_resolve.return_value = _make_provider(_make_chat_client(mock_llm))
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/ai/advisor/recommendation", json=SAMPLE_PORTFOLIO)

    assert response.status_code == 200
    data = response.json()
    assert data["recommendation"] == "Consider diversifying into bonds."
    assert data["rationale"] == "Your portfolio is heavily weighted in equities."
    assert "financial advice" in data["disclaimer"]


async def test_recommendation_falls_back_to_local_when_no_logos_key(
    transport: ASGITransport, authenticated: None
) -> None:
    captured_kwargs: dict[str, object] = {}

    async def capturing_create(**kwargs: object) -> MagicMock:
        captured_kwargs.update(kwargs)
        return _make_chat_response(LLMRecommendation(recommendation="r", rationale="r"))

    mock_client = AsyncMock()
    mock_client.chat.completions.create = capturing_create

    with patch("advisor.recommendation.resolve_llm_provider") as mock_resolve:
        mock_resolve.return_value = _make_provider(mock_client, is_local=True, model="llama3.2")
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/ai/advisor/recommendation", json=SAMPLE_PORTFOLIO)

    assert response.status_code == 200
    assert captured_kwargs["model"] == "llama3.2"
    assert captured_kwargs["temperature"] == 0.0


async def test_recommendation_prompt_contains_portfolio_data(transport: ASGITransport, authenticated: None) -> None:
    captured: list[dict] = []

    async def capturing_create(**kwargs: object) -> MagicMock:
        captured.extend(cast(list[dict], kwargs.get("messages", [])))
        return _make_chat_response(LLMRecommendation(recommendation="r", rationale="r"))

    mock_client = AsyncMock()
    mock_client.chat.completions.create = capturing_create

    with patch("advisor.recommendation.resolve_llm_provider") as mock_resolve:
        mock_resolve.return_value = _make_provider(mock_client)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/ai/advisor/recommendation",
                json={
                    "holdings": [
                        {
                            "symbol": "MSFT",
                            "name": "Microsoft",
                            "asset_class": "STOCK",
                            "shares": 5.0,
                            "current_value": 2000.0,
                            "currency": "EUR",
                        }
                    ],
                    "cash_balance": 100.0,
                    "total_value": 2100.0,
                    "currency": "EUR",
                },
            )
    assert response.status_code == 200

    user_msg = next((m for m in captured if m["role"] == "user"), None)
    assert user_msg is not None, "No user message was sent to the LLM"
    assert "MSFT" in user_msg["content"]
    assert "2100.0" in user_msg["content"]


async def test_recommendation_prompt_contains_risk_tolerance(transport: ASGITransport, authenticated: None) -> None:
    captured: list[dict] = []

    async def capturing_create(**kwargs: object) -> MagicMock:
        captured.extend(cast(list[dict], kwargs.get("messages", [])))
        return _make_chat_response(LLMRecommendation(recommendation="r", rationale="r"))

    mock_client = AsyncMock()
    mock_client.chat.completions.create = capturing_create

    with patch("advisor.recommendation.resolve_llm_provider") as mock_resolve:
        mock_resolve.return_value = _make_provider(mock_client)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            await client.post(
                "/ai/advisor/recommendation",
                json={**SAMPLE_PORTFOLIO, "risk_tolerance": "CONSERVATIVE"},
            )

    user_msg = next((m for m in captured if m["role"] == "user"), None)
    assert user_msg is not None
    assert "CONSERVATIVE" in user_msg["content"]


async def test_recommendation_prompt_omits_risk_tolerance_when_absent(
    transport: ASGITransport, authenticated: None
) -> None:
    captured: list[dict] = []

    async def capturing_create(**kwargs: object) -> MagicMock:
        captured.extend(cast(list[dict], kwargs.get("messages", [])))
        return _make_chat_response(LLMRecommendation(recommendation="r", rationale="r"))

    mock_client = AsyncMock()
    mock_client.chat.completions.create = capturing_create

    with patch("advisor.recommendation.resolve_llm_provider") as mock_resolve:
        mock_resolve.return_value = _make_provider(mock_client)
        portfolio_without_tolerance = {k: v for k, v in SAMPLE_PORTFOLIO.items() if k != "risk_tolerance"}
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            await client.post("/ai/advisor/recommendation", json=portfolio_without_tolerance)

    user_msg = next((m for m in captured if m["role"] == "user"), None)
    assert user_msg is not None
    assert "risk tolerance" not in user_msg["content"].lower()


async def test_recommendation_returns_502_when_client_raises(transport: ASGITransport, authenticated: None) -> None:
    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(side_effect=RuntimeError("upstream exploded"))

    with patch("advisor.recommendation.resolve_llm_provider") as mock_resolve:
        mock_resolve.return_value = _make_provider(mock_client)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/ai/advisor/recommendation", json=SAMPLE_PORTFOLIO)

    assert response.status_code == 502
    assert response.json()["detail"] == "AI service request failed"
    assert "upstream exploded" not in response.text


async def test_recommendation_returns_sanitized_502_when_local_unreachable(
    transport: ASGITransport, authenticated: None
) -> None:
    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(
        side_effect=ConnectionError("Connection refused to host.docker.internal:11434")
    )

    with patch("advisor.recommendation.resolve_llm_provider") as mock_resolve:
        mock_resolve.return_value = _make_provider(mock_client, is_local=True)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/ai/advisor/recommendation", json=SAMPLE_PORTFOLIO)

    assert response.status_code == 502
    assert response.json()["detail"] == "Local LLM is not reachable"
    assert "11434" not in response.text
    assert "Connection refused" not in response.text


async def test_recommendation_returns_502_when_content_empty(transport: ASGITransport, authenticated: None) -> None:
    empty_response = MagicMock()
    empty_response.choices = []

    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=empty_response)

    with patch("advisor.recommendation.resolve_llm_provider") as mock_resolve:
        mock_resolve.return_value = _make_provider(mock_client)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/ai/advisor/recommendation", json=SAMPLE_PORTFOLIO)

    assert response.status_code == 502


async def test_recommendation_returns_502_when_unparsable(transport: ASGITransport, authenticated: None) -> None:
    garbage_response = MagicMock()
    garbage_response.choices[0].message.content = "not valid json"

    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=garbage_response)

    with patch("advisor.recommendation.resolve_llm_provider") as mock_resolve:
        mock_resolve.return_value = _make_provider(mock_client)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/ai/advisor/recommendation", json=SAMPLE_PORTFOLIO)

    assert response.status_code == 502


async def test_recommendation_rejects_invalid_risk_tolerance(transport: ASGITransport, authenticated: None) -> None:
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/ai/advisor/recommendation",
            json={**SAMPLE_PORTFOLIO, "risk_tolerance": "YOLO"},
        )
    assert response.status_code == 422


def _make_chat_response(llm: LLMRecommendation) -> MagicMock:
    mock_response = MagicMock()
    mock_response.choices[0].message.content = json.dumps(llm.model_dump())
    return mock_response


def _make_chat_client(llm: LLMRecommendation) -> AsyncMock:
    mock_client = AsyncMock()
    mock_client.chat.completions.create = AsyncMock(return_value=_make_chat_response(llm))
    return mock_client


def _make_provider(client: AsyncMock, *, is_local: bool = False, model: str = "test-model") -> LlmProvider:
    return LlmProvider(client=client, model=model, is_local=is_local)
