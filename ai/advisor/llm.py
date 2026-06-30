import logging
from dataclasses import dataclass

from openai import AsyncOpenAI

from .config import Settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class LlmProvider:
    """A resolved LLM backend: the OpenAI-compatible client plus the model to call.

    ``is_local`` distinguishes the local fallback (Ollama) from Logos so callers can
    tune the request (e.g. lower temperature) and surface a provider-specific error.
    """

    client: AsyncOpenAI
    model: str
    is_local: bool


def resolve_llm_provider(settings: Settings) -> LlmProvider | None:
    """Pick the active LLM backend.

    Logos is used when an API key is configured; otherwise the service falls back to a
    local OpenAI-compatible LLM (Ollama) when ``local_llm_base_url`` is set. Returns
    ``None`` when neither is configured, signalling that the AI feature is unavailable.
    """
    if settings.logos_api_key:
        logger.info("LLM provider: logos (%s)", settings.logos_model)
        return LlmProvider(
            client=AsyncOpenAI(api_key=settings.logos_api_key, base_url=settings.logos_base_url),
            model=settings.logos_model,
            is_local=False,
        )

    if settings.local_llm_base_url:
        logger.info("LLM provider: local (%s @ %s)", settings.local_llm_model, settings.local_llm_base_url)
        return LlmProvider(
            # Ollama ignores the key but the OpenAI client requires a non-empty one.
            client=AsyncOpenAI(api_key="ollama", base_url=settings.local_llm_base_url),
            model=settings.local_llm_model,
            is_local=True,
        )

    return None
