"""Tests for OAuth (Google / Apple) token verification."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.core.oauth import OAuthUserInfo, verify_google_id_token, verify_apple_identity_token


@pytest.mark.asyncio
async def test_google_oauth_flow():
    mock_info = OAuthUserInfo(
        provider="google",
        subject="google-uid-123",
        email="user@gmail.com",
        email_verified=True,
    )

    with patch("app.core.oauth.google_id_token.verify_oauth2_token") as mock_verify:
        mock_verify.return_value = {
            "sub": "google-uid-123",
            "email": "user@gmail.com",
            "email_verified": True,
        }
        result = await verify_google_id_token("fake-google-token")
        assert result.provider == "google"
        assert result.email == "user@gmail.com"
        assert result.email_verified is True


@pytest.mark.asyncio
async def test_apple_oauth_flow():
    mock_jwks = {
        "keys": [
            {
                "kid": "test-kid",
                "kty": "RSA",
                "n": "fake-n",
                "e": "AQAB",
            }
        ]
    }

    with patch("app.core.oauth._get_apple_public_keys", new_callable=AsyncMock) as mock_keys, \
         patch("app.core.oauth.pyjwt.get_unverified_header") as mock_header, \
         patch("app.core.oauth.pyjwt.decode") as mock_decode, \
         patch("app.core.oauth.RSAAlgorithm.from_jwk") as mock_from_jwk:

        mock_keys.return_value = mock_jwks
        mock_header.return_value = {"kid": "test-kid", "alg": "RS256"}
        mock_from_jwk.return_value = MagicMock()
        mock_decode.return_value = {
            "sub": "apple-uid-456",
            "email": "user@icloud.com",
            "email_verified": True,
        }

        result = await verify_apple_identity_token("fake-apple-token")
        assert result.provider == "apple"
        assert result.email == "user@icloud.com"
        assert result.subject == "apple-uid-456"


@pytest.mark.asyncio
async def test_oauth_invalid_token():
    with patch("app.core.oauth.google_id_token.verify_oauth2_token") as mock_verify:
        mock_verify.side_effect = Exception("Token expired")

        with pytest.raises(ValueError, match="Invalid Google token"):
            await verify_google_id_token("expired-token")
