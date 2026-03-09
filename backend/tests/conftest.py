import asyncio
import os
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
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
os.environ["BILLING_PROVIDER"] = "manual"
os.environ["TWILIO_NUMBER_PROVISIONING_ENABLED"] = "false"
os.environ["TWILIO_ACCOUNT_SID"] = ""
os.environ["TWILIO_AUTH_TOKEN"] = ""
os.environ["INTERNAL_EVENT_SECRET"] = ""
os.environ["ELEVENLABS_WEBHOOK_SECRET"] = ""
os.environ["ELEVENLABS_API_KEY"] = ""
os.environ["ELEVENLABS_AGENT_ID"] = ""
os.environ["NODE_BRIDGE_WS_URL"] = ""
os.environ["INTERNAL_NODE_API_KEY"] = "test-internal-api-key"
os.environ["ELEVENLABS_DEFAULT_VOICE_ID"] = ""
os.environ["AGENT_DEFAULT_SYSTEM_PROMPT_KEY"] = "default_v1"

from app.core.rate_limiter import reset_memory_store
from app.database import Base, get_db
from app.main import app

test_engine = create_async_engine("sqlite+aiosqlite://", echo=False)
test_session_factory = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@event.listens_for(test_engine.sync_engine, "connect")
def _register_sqlite_functions(dbapi_connection, connection_record):
    """Register PostgreSQL-compatible functions for SQLite testing."""
    dbapi_connection.create_function("now", 0, lambda: datetime.now(UTC).isoformat())


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


async def _seed_catalog_data():
    """Seed voice catalog and prompt suggestions for tests (mirrors migration 012)."""
    from app.models.prompt_suggestion import PromptSuggestion
    from app.models.voice_catalog import VoiceCatalog

    async with test_session_factory() as session:
        existing_voice = (await session.execute(
            __import__("sqlalchemy").select(VoiceCatalog).limit(1)
        )).scalar_one_or_none()
        if existing_voice:
            return

        session.add(VoiceCatalog(
            id=__import__("uuid").UUID("00000000-0000-4000-a000-000000000001"),
            provider_voice_id="21m00Tcm4TlvDq8ikWAM",
            display_name="Rachel", locale="en", gender_tag="female", sort_order=0,
        ))
        session.add(VoiceCatalog(
            id=__import__("uuid").UUID("00000000-0000-4000-a000-000000000002"),
            provider_voice_id="pNInz6obpgDQGcFmaJgB",
            display_name="Adam", locale="en", gender_tag="male", sort_order=1,
        ))
        session.add(PromptSuggestion(
            id=__import__("uuid").UUID("00000000-0000-4000-b000-000000000001"),
            title="Professional tone",
            text="Always maintain a professional and polite tone when speaking with callers.",
            sort_order=0,
        ))
        session.add(PromptSuggestion(
            id=__import__("uuid").UUID("00000000-0000-4000-b000-000000000002"),
            title="Take messages",
            text=(
                "If the caller wants to leave a message,"
                " collect their name, number, and a brief message."
            ),
            sort_order=1,
        ))
        await session.commit()


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _seed_catalog_data()
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    reset_memory_store()

    from app.services.auth_service import _memory_fallback
    _memory_fallback.clear()


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
    password: str = "SecurePassword123!",  # noqa: S107
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

    import json

    from app.core.security import generate_token, hash_token
    from app.services.auth_service import _VERIFY_PREFIX, _memory_fallback

    raw_token = generate_token(32)
    user_id = data["user_id"]
    token_hash = hash_token(raw_token)

    found = False
    for key in list(_memory_fallback.keys()):
        if key.startswith(_VERIFY_PREFIX):
            payload_str, expires = _memory_fallback[key]
            payload = json.loads(payload_str)
            if payload.get("user_id") == user_id:
                _memory_fallback.pop(key)
                _memory_fallback[f"{_VERIFY_PREFIX}{token_hash}"] = (
                    json.dumps({"user_id": user_id}),
                    expires,
                )
                found = True
                break

    if not found:
        pytest.fail("No verification token found for test user")

    resp = await client.post(
        "/api/v1/auth/email/verify",
        json={"token": raw_token},
    )
    assert resp.status_code == 200

    resp = await client.post(
        "/api/v1/auth/login",
        json={
            "email": email,
            "password": password,
            "device": {"platform": "ios", "device_name": "Test iPhone"},
        },
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
