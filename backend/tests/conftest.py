import asyncio
import os
import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

os.environ["DATABASE_URL"] = "sqlite+aiosqlite://"
os.environ["DATABASE_URL_SYNC"] = "sqlite://"
os.environ["REDIS_URL"] = "redis://localhost:6379/15"
os.environ["JWT_SIGNING_KEY"] = "test-signing-key-for-unit-tests-only-32b"
os.environ["JWT_KEY_ID"] = "test-key-001"
os.environ["ENCRYPTION_MASTER_KEY"] = "a" * 64
os.environ["GOOGLE_CLIENT_ID"] = "test-google-client-id"
os.environ["ENVIRONMENT"] = "test"
os.environ["EMAIL_PROVIDER"] = "console"

from app.database import Base, get_db
from app.main import app
from app.core.rate_limiter import reset_memory_store

test_engine = create_async_engine("sqlite+aiosqlite://", echo=False)
test_session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    reset_memory_store()


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with test_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def db() -> AsyncGenerator[AsyncSession, None]:
    async with test_session_factory() as session:
        yield session


async def create_test_user(
    client: AsyncClient,
    email: str = "test@example.com",
    password: str = "SecurePassword123!",
) -> dict:
    """Helper: register + verify email + enroll MFA, returns tokens."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "device": {"platform": "ios", "device_name": "Test iPhone"},
        },
    )
    assert resp.status_code == 201
    data = resp.json()

    from app.services.auth_service import _verification_tokens
    from app.core.security import hash_token

    token_hash = None
    raw_token = None
    for th, (uid, exp) in _verification_tokens.items():
        if str(uid) == data["user_id"]:
            token_hash = th
            break

    if token_hash is None:
        pytest.fail("No verification token found")

    for th, (uid, exp) in list(_verification_tokens.items()):
        if str(uid) == data["user_id"]:
            from app.core.security import generate_token
            raw_token = generate_token(32)
            _verification_tokens[hash_token(raw_token)] = (uid, exp)
            if th != hash_token(raw_token):
                _verification_tokens.pop(th, None)
            break

    resp = await client.post(
        "/api/v1/auth/email/verify",
        json={"token": raw_token},
    )
    assert resp.status_code == 200

    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    login_data = resp.json()

    if login_data.get("requires_mfa_enrollment"):
        resp = await client.post(
            "/api/v1/auth/mfa/totp/start",
            headers={"Authorization": f"Bearer {login_data['partial_token']}"},
        )
        totp_data = resp.json()

        import pyotp
        totp = pyotp.TOTP(totp_data["secret"])
        code = totp.now()

        resp = await client.post(
            "/api/v1/auth/mfa/totp/confirm",
            json={
                "mfa_setup_token": totp_data["mfa_setup_token"],
                "totp_code": code,
            },
        )
        assert resp.status_code == 200
        tokens = resp.json()
        return {
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "recovery_codes": tokens["recovery_codes"],
            "email": email,
            "password": password,
            "totp_secret": totp_data["secret"],
        }

    pytest.fail("Expected MFA enrollment required after login")
