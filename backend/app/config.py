from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://mattbot:mattbot@localhost:5432/mattbot"
    DATABASE_URL_SYNC: str = "postgresql://mattbot:mattbot@localhost:5432/mattbot"
    REDIS_URL: str = "redis://localhost:6379/0"

    JWT_SIGNING_KEY: str = "CHANGE_ME"
    JWT_KEY_ID: str = "key-001"
    JWT_ACCESS_TOKEN_MINUTES: int = 15
    JWT_ALGORITHM: str = "HS256"

    ENCRYPTION_MASTER_KEY: str = "CHANGE_ME"

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_ANDROID_CLIENT_ID: str = ""
    APPLE_BUNDLE_ID: str = "com.mattbot.app"
    APPLE_TEAM_ID: str = ""

    EMAIL_PROVIDER: str = "console"
    EMAIL_FROM: str = "noreply@mattbot.app"
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SENDGRID_API_KEY: str = ""
    APP_LINK_BASE_URL: str = ""

    SENTRY_DSN: str = ""
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1
    ENVIRONMENT: str = "development"

    REFRESH_TOKEN_DAYS: int = 30
    ABSOLUTE_SESSION_DAYS: int = 90

    PASSWORD_MIN_LENGTH: int = 12
    PASSWORD_MAX_LENGTH: int = 128

    PIN_LENGTH: int = 6
    PIN_MAX_ATTEMPTS: int = 5
    PIN_COOLDOWN_SCHEDULE: list[int] = [0, 10, 30, 60, 120]

    ACCOUNT_LOCKOUT_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_WINDOW_MINUTES: int = 10
    ACCOUNT_LOCKOUT_DURATION_MINUTES: int = 15

    # Rate Limit Tiers (requests / window_seconds)
    IP_RATE_LIMIT_REQUESTS: int = 20
    IP_RATE_LIMIT_WINDOW_MINUTES: int = 10
    RATE_LIMIT_AUTH_IP_MAX: int = 20
    RATE_LIMIT_AUTH_IP_WINDOW: int = 600
    RATE_LIMIT_AUTH_ACCOUNT_MAX: int = 5
    RATE_LIMIT_AUTH_ACCOUNT_WINDOW: int = 600
    RATE_LIMIT_AUTH_SENSITIVE_MAX: int = 3
    RATE_LIMIT_AUTH_SENSITIVE_WINDOW: int = 3600
    RATE_LIMIT_API_STANDARD_MAX: int = 30
    RATE_LIMIT_API_STANDARD_WINDOW: int = 60
    RATE_LIMIT_API_WRITE_MAX: int = 20
    RATE_LIMIT_API_WRITE_WINDOW: int = 60
    RATE_LIMIT_WEBHOOK_MAX: int = 60
    RATE_LIMIT_WEBHOOK_WINDOW: int = 60
    RATE_LIMIT_INTERNAL_MAX: int = 100
    RATE_LIMIT_INTERNAL_WINDOW: int = 60
    RATE_LIMIT_OVERRIDES_JSON: str = ""

    BILLING_PROVIDER: str = "manual"
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_FREE: str = ""
    STRIPE_PRICE_STANDARD: str = ""
    STRIPE_PRICE_PRO: str = ""

    BILLING_PLANS_JSON: str = ""
    BILLING_UPGRADE_RULES_JSON: str = ""
    STRIPE_PRICE_IDS_JSON: str = ""
    BILLING_PERIOD_DAYS: int = 30
    BILLING_CONFIG_CACHE_TTL: int = 60

    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_NUMBER_PROVISIONING_ENABLED: bool = False
    TWILIO_WEBHOOK_BASE_URL: str = ""

    HANDOFF_CALLER_ID: str = ""
    HANDOFF_OFFER_DEFAULT_TIMEOUT: int = 20
    HANDOFF_TRANSFER_TIMEOUT_CAP: int = 30
    HANDOFF_SUPPRESSION_TTL: int = 90

    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_AGENT_ID: str = ""
    ELEVENLABS_WEBHOOK_SECRET: str = ""
    ELEVENLABS_DEFAULT_VOICE_ID: str = ""
    ELEVENLABS_API_BASE_URL: str = "https://api.elevenlabs.io/v1/convai/conversations"
    ELEVENLABS_TRANSCRIPT_TIMEOUT: float = 30.0
    ELEVENLABS_TRANSCRIPT_MAX_RETRIES: int = 10
    ELEVENLABS_TOOL_WEBHOOK_SECRET: str = ""

    GOOGLE_CALENDAR_CLIENT_ID: str = ""
    GOOGLE_CALENDAR_CLIENT_SECRET: str = ""
    GOOGLE_CALENDAR_REDIRECT_URI: str = ""
    GOOGLE_CALENDAR_SCOPES: str = "https://www.googleapis.com/auth/calendar.events"

    FCM_SERVICE_ACCOUNT_JSON: str = ""

    AGENT_DEFAULT_SYSTEM_PROMPT_KEY: str = "screening_v2"

    NODE_BRIDGE_WS_URL: str = "wss://localhost:3001/twilio/media"
    ENABLE_REALTIME_BRIDGE: bool = False
    NODE_BRIDGE_INTERNAL_URL: str = "http://localhost:3001"
    INTERNAL_EVENT_SECRET: str = ""
    INTERNAL_NODE_API_KEY: str = ""

    # External service timeouts
    SENDGRID_TIMEOUT: float = 10.0
    SENDGRID_MAX_RETRIES: int = 2
    SENDGRID_RETRY_DELAY: float = 0.5
    APPLE_JWKS_TIMEOUT: int = 10
    EVENT_EMITTER_TIMEOUT: float = 10.0

    # Token / session expiry
    EMAIL_VERIFY_TOKEN_TTL: int = 900
    PASSWORD_RESET_TOKEN_TTL: int = 900
    EMAIL_OTP_TTL: int = 600
    MFA_CHALLENGE_EXPIRY_MINUTES: int = 10
    STEP_UP_TOKEN_EXPIRY_MINUTES: int = 5
    STREAM_SESSION_TOKEN_TTL: int = 300

    # Feature thresholds and operational defaults
    DEFAULT_CALL_RETENTION_DAYS: int = 90
    DEFAULT_MAX_CALL_SECONDS: int = 180
    VIP_MAX_CALL_SECONDS: int = 300
    FWD_DETECT_THRESHOLD: int = 3
    FWD_DETECT_WINDOW_SECONDS: int = 3600
    NUMBER_PENDING_TTL_MINUTES: int = 15
    DEFAULT_ASSISTANT_NAME: str = "Alex"

    # Worker intervals (seconds)
    WORKER_POST_CALL_INTERVAL: int = 15
    WORKER_REMINDER_INTERVAL: int = 60
    WORKER_SMS_INTERVAL: int = 30
    WORKER_HANDOFF_EXPIRY_INTERVAL: int = 5
    WORKER_NUMBER_LIFECYCLE_INTERVAL: int = 300
    WORKER_RETENTION_INTERVAL: int = 1800
    WORKER_HARD_DELETION_INTERVAL: int = 3600

    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 50

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
