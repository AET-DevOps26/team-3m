from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    logos_api_key: str = ""
    logos_base_url: str = "https://logos.aet.cit.tum.de/v1"
    keycloak_issuer: str = "http://localhost:8081/realms/kontor"
    keycloak_jwk_set_uri: str = "http://localhost:8081/realms/kontor/protocol/openid-connect/certs"
    keycloak_audience: str = "kontor-api"


@lru_cache
def get_settings() -> Settings:
    return Settings()
