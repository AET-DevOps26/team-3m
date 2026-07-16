import logging
from dataclasses import dataclass

from openai import AsyncOpenAI

from .config import Settings
from .openai_client import shared_async_openai

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class EmbeddingProvider:
    client: AsyncOpenAI
    model: str


def resolve_embedding_provider(settings: Settings) -> EmbeddingProvider | None:
    """Logos when a key + model are set, else local Ollama when configured, else None (feature off)."""
    if settings.logos_api_key and settings.logos_embedding_model:
        logger.info("Embedding provider: logos (%s)", settings.logos_embedding_model)
        return EmbeddingProvider(
            client=shared_async_openai(api_key=settings.logos_api_key, base_url=settings.logos_base_url),
            model=settings.logos_embedding_model,
        )

    if settings.local_llm_base_url:
        logger.info("Embedding provider: local (%s @ %s)", settings.local_embedding_model, settings.local_llm_base_url)
        return EmbeddingProvider(
            # Ollama ignores the key but the OpenAI client requires a non-empty one.
            client=shared_async_openai(api_key="ollama", base_url=settings.local_llm_base_url),
            model=settings.local_embedding_model,
        )

    return None


async def embed_text(provider: EmbeddingProvider, text: str) -> list[float]:
    response = await provider.client.embeddings.create(model=provider.model, input=text)
    return response.data[0].embedding
