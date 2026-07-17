from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jwt.exceptions import InvalidTokenError

from advisor.auth import require_authenticated_user
from advisor.config import Settings

SETTINGS = Settings(ai_api_key="hosted-test")
CREDENTIALS = HTTPAuthorizationCredentials(scheme="Bearer", credentials="a.b.c")


async def test_rejects_missing_credentials() -> None:
    with pytest.raises(HTTPException) as exc_info:
        await require_authenticated_user(credentials=None, settings=SETTINGS)
    assert exc_info.value.status_code == 401


async def test_accepts_valid_token() -> None:
    with (
        patch("advisor.auth._jwk_client") as mock_jwk_client,
        patch("advisor.auth.jwt.decode", return_value={"sub": "user-123"}),
    ):
        mock_jwk_client.return_value.get_signing_key_from_jwt.return_value = MagicMock(key="signing-key")
        subject = await require_authenticated_user(credentials=CREDENTIALS, settings=SETTINGS)
    assert subject == "user-123"


async def test_rejects_invalid_token() -> None:
    with (
        patch("advisor.auth._jwk_client") as mock_jwk_client,
        patch("advisor.auth.jwt.decode", side_effect=InvalidTokenError("expired")),
    ):
        mock_jwk_client.return_value.get_signing_key_from_jwt.return_value = MagicMock(key="signing-key")
        with pytest.raises(HTTPException) as exc_info:
            await require_authenticated_user(credentials=CREDENTIALS, settings=SETTINGS)
    assert exc_info.value.status_code == 401


async def test_rejects_token_without_subject() -> None:
    with (
        patch("advisor.auth._jwk_client") as mock_jwk_client,
        patch("advisor.auth.jwt.decode", return_value={"aud": "kontor-api"}),
    ):
        mock_jwk_client.return_value.get_signing_key_from_jwt.return_value = MagicMock(key="signing-key")
        with pytest.raises(HTTPException) as exc_info:
            await require_authenticated_user(credentials=CREDENTIALS, settings=SETTINGS)
    assert exc_info.value.status_code == 401
