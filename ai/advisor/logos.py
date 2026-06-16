from functools import lru_cache

from openai import AsyncOpenAI

from .config import Settings, get_settings

LOGOS_MODEL = "openai/gpt-oss-120b"


def make_logos_client(settings: Settings) -> AsyncOpenAI:
    return AsyncOpenAI(api_key=settings.logos_api_key, base_url=settings.logos_base_url)


@lru_cache
def get_logos_client() -> AsyncOpenAI:
    return make_logos_client(get_settings())
