import pytest

from advisor.config import Settings
from advisor.logos import make_logos_client


def test_settings_reads_logos_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LOGOS_API_KEY", "lg-test-key")
    settings = Settings()
    assert settings.logos_api_key == "lg-test-key"


def test_settings_defaults_logos_base_url() -> None:
    settings = Settings()
    assert settings.logos_base_url == "https://logos.aet.cit.tum.de/v1"


def test_logos_api_key_defaults_to_empty() -> None:
    settings = Settings()
    assert settings.logos_api_key == ""


def test_make_logos_client_uses_api_key() -> None:
    settings = Settings(logos_api_key="lg-test-key", logos_base_url="https://logos.aet.cit.tum.de/v1")
    client = make_logos_client(settings)
    assert client.api_key == "lg-test-key"


def test_make_logos_client_uses_base_url() -> None:
    settings = Settings(logos_api_key="lg-test-key", logos_base_url="https://logos.test/v1")
    client = make_logos_client(settings)
    assert str(client.base_url) == "https://logos.test/v1/"
