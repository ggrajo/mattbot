"""Google and Apple OIDC token validation."""

from dataclasses import dataclass

import httpx
import jwt as pyjwt
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from app.config import settings


@dataclass
class OAuthUserInfo:
    provider: str
    subject: str
    email: str | None
    email_verified: bool


async def verify_google_id_token(token: str) -> OAuthUserInfo:
    """Validate a Google OIDC ID token server-side."""
    try:
        idinfo = google_id_token.verify_oauth2_token(
            token, google_requests.Request(), settings.GOOGLE_CLIENT_ID
        )
    except Exception as e:
        raise ValueError(f"Invalid Google token: {e}") from e

    return OAuthUserInfo(
        provider="google",
        subject=idinfo["sub"],
        email=idinfo.get("email"),
        email_verified=idinfo.get("email_verified", False),
    )


_APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"
_apple_jwks_cache: dict | None = None


async def _get_apple_public_keys() -> dict:
    global _apple_jwks_cache
    if _apple_jwks_cache is None:
        async with httpx.AsyncClient() as client:
            resp = await client.get(_APPLE_JWKS_URL, timeout=settings.APPLE_JWKS_TIMEOUT)
            resp.raise_for_status()
            _apple_jwks_cache = resp.json()
    return _apple_jwks_cache


async def verify_apple_identity_token(token: str) -> OAuthUserInfo:
    """Validate an Apple Sign-In identity token."""
    try:
        jwks_data = await _get_apple_public_keys()

        header = pyjwt.get_unverified_header(token)
        kid = header.get("kid")
        if not kid:
            raise ValueError("Missing kid in Apple token header")

        matching_key = None
        for key_data in jwks_data.get("keys", []):
            if key_data.get("kid") == kid:
                from jwt.algorithms import RSAAlgorithm
                matching_key = RSAAlgorithm.from_jwk(key_data)
                break

        if matching_key is None:
            raise ValueError("No matching Apple public key found")

        payload = pyjwt.decode(
            token,
            matching_key,  # type: ignore[arg-type]
            algorithms=["RS256"],
            audience=settings.APPLE_BUNDLE_ID,
            issuer="https://appleid.apple.com",
        )
    except Exception as e:
        raise ValueError(f"Invalid Apple token: {e}") from e

    return OAuthUserInfo(
        provider="apple",
        subject=payload["sub"],
        email=payload.get("email"),
        email_verified=payload.get("email_verified", False) if payload.get("email") else False,
    )
