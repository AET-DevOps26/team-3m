import pytest

from advisor.config import Settings
from advisor.llm import resolve_llm_provider


def test_settings_reads_logos_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LOGOS_API_KEY", "lg-test-key")
    settings = Settings()
    assert settings.logos_api_key == "lg-test-key"


def test_settings_defaults_logos_base_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("LOGOS_API_KEY", raising=False)
    settings = Settings()
    assert settings.logos_base_url == "https://logos.aet.cit.tum.de/v1"


def test_logos_api_key_defaults_to_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("LOGOS_API_KEY", raising=False)
    settings = Settings()
    assert settings.logos_api_key == ""


def test_resolve_llm_provider_uses_logos_when_key_present() -> None:
    settings = Settings(logos_api_key="lg-test-key", logos_base_url="https://logos.test/v1")
    provider = resolve_llm_provider(settings)
    assert provider is not None
    assert provider.name == "logos"
    assert provider.is_local is False
    assert provider.model == settings.logos_model
    assert provider.client.api_key == "lg-test-key"
    assert str(provider.client.base_url) == "https://logos.test/v1/"


def test_resolve_llm_provider_prefers_logos_when_both_configured() -> None:
    settings = Settings(logos_api_key="lg-test-key", local_llm_base_url="http://localhost:11434/v1")
    provider = resolve_llm_provider(settings)
    assert provider is not None
    assert provider.name == "logos"
    assert provider.is_local is False


def test_resolve_llm_provider_falls_back_to_local_without_key() -> None:
    settings = Settings(
        logos_api_key="",
        local_llm_base_url="http://localhost:11434/v1",
        local_llm_model="llama3.2",
    )
    provider = resolve_llm_provider(settings)
    assert provider is not None
    assert provider.name == "local"
    assert provider.is_local is True
    assert provider.model == "llama3.2"
    assert str(provider.client.base_url) == "http://localhost:11434/v1/"
    assert provider.client.api_key == "ollama"


def test_resolve_llm_provider_returns_none_when_nothing_configured() -> None:
    settings = Settings(logos_api_key="", local_llm_base_url="")
    assert resolve_llm_provider(settings) is None
