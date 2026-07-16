import logging
from dataclasses import dataclass

from openai import AsyncOpenAI

from .config import Settings
from .openai_client import shared_async_openai

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class LlmProvider:
    client: AsyncOpenAI
    model: str
    is_local: bool


def resolve_llm_provider(settings: Settings) -> LlmProvider | None:
    """Logos when a key is set, else local Ollama when configured, else None (feature off)."""
    if settings.logos_api_key:
        logger.info("LLM provider: logos (%s)", settings.logos_model)
        return LlmProvider(
            client=shared_async_openai(api_key=settings.logos_api_key, base_url=settings.logos_base_url),
            model=settings.logos_model,
            is_local=False,
        )

    if settings.local_llm_base_url:
        logger.info("LLM provider: local (%s @ %s)", settings.local_llm_model, settings.local_llm_base_url)
        return LlmProvider(
            # Ollama ignores the key but the OpenAI client requires a non-empty one.
            client=shared_async_openai(api_key="ollama", base_url=settings.local_llm_base_url),
            model=settings.local_llm_model,
            is_local=True,
        )

    return None
