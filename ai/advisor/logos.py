from openai import AsyncOpenAI

from .config import Settings

LOGOS_MODEL = "openai/gpt-oss-120b"


def make_logos_client(settings: Settings) -> AsyncOpenAI:
    return AsyncOpenAI(api_key=settings.logos_api_key, base_url=settings.logos_base_url)
