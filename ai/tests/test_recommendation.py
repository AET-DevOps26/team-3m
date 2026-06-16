import json
from collections.abc import Generator
from typing import cast
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from advisor.config import Settings, get_settings
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
def settings_with_key() -> Generator[None]:
    app.dependency_overrides[get_settings] = lambda: Settings(logos_api_key="lg-test")
    yield
    app.dependency_overrides.pop(get_settings, None)


@pytest.fixture
def settings_without_key() -> Generator[None]:
    app.dependency_overrides[get_settings] = lambda: Settings(logos_api_key="")
    yield
    app.dependency_overrides.pop(get_settings, None)


async def test_recommendation_returns_503_when_no_api_key(transport: ASGITransport, settings_without_key: None) -> None:
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/ai/advisor/recommendation", json=SAMPLE_PORTFOLIO)
    assert response.status_code == 503


async def test_recommendation_returns_structured_response(transport: ASGITransport, settings_with_key: None) -> None:
    mock_llm = LLMRecommendation(
        recommendation="Consider diversifying into bonds.",
        rationale="Your portfolio is heavily weighted in equities.",
    )

    with patch("advisor.recommendation.make_logos_client") as mock_factory:
        mock_factory.return_value = _make_mock_logos(mock_llm)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/ai/advisor/recommendation", json=SAMPLE_PORTFOLIO)

    assert response.status_code == 200
    data = response.json()
    assert data["recommendation"] == "Consider diversifying into bonds."
    assert data["rationale"] == "Your portfolio is heavily weighted in equities."
    assert "financial advice" in data["disclaimer"]


async def test_recommendation_prompt_contains_portfolio_data(transport: ASGITransport, settings_with_key: None) -> None:
    captured: list[dict] = []

    async def capturing_create(**kwargs: object) -> MagicMock:
        captured.extend(cast(list[dict], kwargs.get("messages", [])))
        return _make_chat_response(LLMRecommendation(recommendation="r", rationale="r"))

    with patch("advisor.recommendation.make_logos_client") as mock_factory:
        mock_logos = AsyncMock()
        mock_logos.chat.completions.create = capturing_create
        mock_factory.return_value = mock_logos

        async with AsyncClient(transport=transport, base_url="http://test") as client:
            await client.post(
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

    user_msg = next((m for m in captured if m["role"] == "user"), None)
    assert user_msg is not None, "No user message was sent to the LLM"
    assert "MSFT" in user_msg["content"]
    assert "2100.0" in user_msg["content"]


async def test_recommendation_prompt_contains_risk_tolerance(transport: ASGITransport, settings_with_key: None) -> None:
    captured: list[dict] = []

    async def capturing_create(**kwargs: object) -> MagicMock:
        captured.extend(cast(list[dict], kwargs.get("messages", [])))
        return _make_chat_response(LLMRecommendation(recommendation="r", rationale="r"))

    with patch("advisor.recommendation.make_logos_client") as mock_factory:
        mock_logos = AsyncMock()
        mock_logos.chat.completions.create = capturing_create
        mock_factory.return_value = mock_logos

        async with AsyncClient(transport=transport, base_url="http://test") as client:
            await client.post(
                "/ai/advisor/recommendation",
                json={**SAMPLE_PORTFOLIO, "risk_tolerance": "CONSERVATIVE"},
            )

    user_msg = next((m for m in captured if m["role"] == "user"), None)
    assert user_msg is not None
    assert "CONSERVATIVE" in user_msg["content"]


async def test_recommendation_prompt_omits_risk_tolerance_when_absent(
    transport: ASGITransport, settings_with_key: None
) -> None:
    captured: list[dict] = []

    async def capturing_create(**kwargs: object) -> MagicMock:
        captured.extend(cast(list[dict], kwargs.get("messages", [])))
        return _make_chat_response(LLMRecommendation(recommendation="r", rationale="r"))

    with patch("advisor.recommendation.make_logos_client") as mock_factory:
        mock_logos = AsyncMock()
        mock_logos.chat.completions.create = capturing_create
        mock_factory.return_value = mock_logos

        portfolio_without_tolerance = {k: v for k, v in SAMPLE_PORTFOLIO.items() if k != "risk_tolerance"}
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            await client.post("/ai/advisor/recommendation", json=portfolio_without_tolerance)

    user_msg = next((m for m in captured if m["role"] == "user"), None)
    assert user_msg is not None
    assert "risk tolerance" not in user_msg["content"].lower()


def _make_chat_response(llm: LLMRecommendation) -> MagicMock:
    mock_response = MagicMock()
    mock_response.choices[0].message.content = json.dumps(llm.model_dump())
    return mock_response


def _make_mock_logos(llm: LLMRecommendation) -> AsyncMock:
    mock_logos = AsyncMock()
    mock_logos.chat.completions.create = AsyncMock(return_value=_make_chat_response(llm))
    return mock_logos
