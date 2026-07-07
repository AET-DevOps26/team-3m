from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://kontor_ai:change-me-local@localhost:5432/kontor_ai"
    logos_api_key: str = ""
    logos_base_url: str = "https://logos.aet.cit.tum.de/v1"
    logos_model: str = "openai/gpt-oss-120b"
    local_llm_base_url: str = "http://localhost:11434/v1"
    local_llm_model: str = "llama3.2"
    keycloak_issuer: str = "http://localhost:8081/realms/kontor"
    keycloak_jwk_set_uri: str = "http://localhost:8081/realms/kontor/protocol/openid-connect/certs"
    keycloak_audience: str = "kontor-api"


@lru_cache
def get_settings() -> Settings:
    return Settings()
