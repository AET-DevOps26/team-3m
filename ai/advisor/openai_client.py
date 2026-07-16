from functools import lru_cache

from openai import AsyncOpenAI


@lru_cache
def shared_async_openai(*, api_key: str, base_url: str) -> AsyncOpenAI:
    """Process-lifetime AsyncOpenAI per (api_key, base_url) so the httpx connection pool is reused."""
    return AsyncOpenAI(api_key=api_key, base_url=base_url)
