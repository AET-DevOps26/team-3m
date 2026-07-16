from functools import lru_cache
from urllib.parse import urlparse

from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://kontor_ai:change-me-local@localhost:5432/kontor_ai"
    ai_api_key: str = ""
    ai_base_url: str = "https://api.openai.com/v1"
    ai_chat_model: str = "gpt-5.4-mini-2026-03-17"
    ai_embedding_model: str = "text-embedding-3-small"
    local_llm_base_url: str = ""
    local_llm_model: str = "llama3.2"
    local_embedding_model: str = "nomic-embed-text"
    rabbitmq_url: str = ""
    rabbitmq_host: str = ""
    rabbitmq_port: int = 5672
    rabbitmq_username: str = "guest"
    rabbitmq_password: str = "guest"
    news_queue: str = "news.articles"
    news_dead_letter_exchange: str = "kontor.news.dlx"
    news_dead_letter_routing_key: str = "news.article.crawled.dead"
    keycloak_issuer: str = "http://localhost:8081/realms/kontor"
    keycloak_jwk_set_uri: str = "http://localhost:8081/realms/kontor/protocol/openid-connect/certs"
    keycloak_audience: str = "kontor-api"

    @model_validator(mode="after")
    def validate_hosted_provider_url(self) -> Settings:
        if not self.ai_api_key:
            return self

        parsed = urlparse(self.ai_base_url)
        if parsed.scheme != "https" or not parsed.netloc:
            raise ValueError("AI_BASE_URL must be an absolute HTTPS URL when AI_API_KEY is set")
        if parsed.username or parsed.password:
            raise ValueError("AI_BASE_URL must not contain credentials")
        return self

    @property
    def is_news_consumer_configured(self) -> bool:
        return bool(self.rabbitmq_url or self.rabbitmq_host)


@lru_cache
def get_settings() -> Settings:
    return Settings()
