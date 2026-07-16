from unittest.mock import AsyncMock, MagicMock

from advisor.config import Settings
from advisor.embeddings import EmbeddingProvider, embed_text, resolve_embedding_provider


def test_resolve_prefers_hosted_provider_when_key_and_model_set() -> None:
    settings = Settings(ai_api_key="hosted-key", ai_embedding_model="text-embed")
    provider = resolve_embedding_provider(settings)

    assert provider is not None
    assert provider.model == "text-embed"


def test_resolve_falls_back_to_ollama_without_hosted_key() -> None:
    settings = Settings(ai_api_key="", local_llm_base_url="http://x:11434/v1", local_embedding_model="nomic-embed-text")
    provider = resolve_embedding_provider(settings)

    assert provider is not None
    assert provider.model == "nomic-embed-text"


def test_resolve_skips_hosted_provider_when_embedding_model_missing() -> None:
    settings = Settings(ai_api_key="hosted-key", ai_embedding_model="", local_llm_base_url="")
    assert resolve_embedding_provider(settings) is None


def test_resolve_none_when_nothing_configured() -> None:
    settings = Settings(ai_api_key="", local_llm_base_url="")
    assert resolve_embedding_provider(settings) is None


async def test_embed_text_returns_vector() -> None:
    response = MagicMock()
    response.data[0].embedding = [0.1, 0.2, 0.3]
    client = AsyncMock()
    client.embeddings.create = AsyncMock(return_value=response)
    provider = EmbeddingProvider(client=client, model="m")

    result = await embed_text(provider, "some news text")

    assert result == [0.1, 0.2, 0.3]
    client.embeddings.create.assert_awaited_once_with(model="m", input="some news text")
