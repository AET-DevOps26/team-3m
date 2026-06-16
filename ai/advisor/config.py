from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    logos_api_key: str = ""
    logos_base_url: str = "https://logos.aet.cit.tum.de/v1"


@lru_cache
def get_settings() -> Settings:
    return Settings()
