from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://kontor_ai:change-me-local@localhost:5432/kontor_ai"
    logos_api_key: str = ""
    logos_base_url: str = "https://logos.aet.cit.tum.de/v1"
    logos_model: str = "openai/gpt-oss-120b"
    logos_embedding_model: str = "Qwen/Qwen3-Embedding-8B"
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

    @property
    def is_news_consumer_configured(self) -> bool:
        return bool(self.rabbitmq_url or self.rabbitmq_host)


@lru_cache
def get_settings() -> Settings:
    return Settings()
