import pytest

from advisor.config import Settings
from advisor.llm import resolve_llm_provider


def test_settings_reads_ai_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AI_API_KEY", "hosted-test-key")
    settings = Settings()
    assert settings.ai_api_key == "hosted-test-key"


def test_settings_defaults_to_openai_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AI_API_KEY", raising=False)
    settings = Settings()

    assert settings.ai_base_url == "https://api.openai.com/v1"
    assert settings.ai_chat_model == "gpt-5.4-mini"
    assert settings.ai_embedding_model == "text-embedding-3-small"


def test_ai_api_key_defaults_to_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AI_API_KEY", raising=False)
    settings = Settings()
    assert settings.ai_api_key == ""


@pytest.mark.parametrize(
    "base_url",
    [
        "http://provider.test/v1",
        "provider.test/v1",
        "https://user:password@provider.test/v1",
        "https://provider.test:8443/v1",
        "https://provider.test:80/v1",
    ],
)
def test_hosted_provider_requires_safe_https_url(base_url: str) -> None:
    with pytest.raises(ValueError, match="AI_BASE_URL"):
        Settings(ai_api_key="hosted-test-key", ai_base_url=base_url)


@pytest.mark.parametrize(
    "base_url",
    [
        "https://provider.test/v1",
        "https://provider.test:443/v1",
    ],
)
def test_hosted_provider_accepts_absolute_https_url(base_url: str) -> None:
    settings = Settings(ai_api_key="hosted-test-key", ai_base_url=base_url)
    assert settings.ai_base_url == base_url


def test_news_consumer_defaults_match_aggregator_contract() -> None:
    settings = Settings()

    assert settings.news_queue == "news.articles"
    assert settings.rabbitmq_port == 5672


def test_news_consumer_is_configured_by_host_or_url() -> None:
    assert Settings(rabbitmq_host="rabbitmq").is_news_consumer_configured is True
    assert Settings(rabbitmq_url="amqps://broker.example/kontor").is_news_consumer_configured is True
    assert Settings(rabbitmq_host="", rabbitmq_url="").is_news_consumer_configured is False


def test_resolve_llm_provider_uses_hosted_provider_when_key_present() -> None:
    settings = Settings(
        ai_api_key="hosted-test-key",
        ai_base_url="https://provider.test/v1",
        ai_chat_model="hosted-chat-model",
    )
    provider = resolve_llm_provider(settings)

    assert provider is not None
    assert provider.is_local is False
    assert provider.model == "hosted-chat-model"
    assert provider.client.api_key == "hosted-test-key"
    assert str(provider.client.base_url) == "https://provider.test/v1/"


def test_resolve_llm_provider_prefers_hosted_provider_when_both_configured() -> None:
    settings = Settings(ai_api_key="hosted-test-key", local_llm_base_url="http://localhost:11434/v1")
    provider = resolve_llm_provider(settings)

    assert provider is not None
    assert provider.is_local is False


def test_resolve_llm_provider_falls_back_to_local_without_key() -> None:
    settings = Settings(
        ai_api_key="",
        local_llm_base_url="http://localhost:11434/v1",
        local_llm_model="llama3.2",
    )
    provider = resolve_llm_provider(settings)
    assert provider is not None
    assert provider.is_local is True
    assert provider.model == "llama3.2"
    assert str(provider.client.base_url) == "http://localhost:11434/v1/"
    assert provider.client.api_key == "ollama"


def test_resolve_llm_provider_returns_none_when_nothing_configured() -> None:
    settings = Settings(ai_api_key="", local_llm_base_url="")
    assert resolve_llm_provider(settings) is None
