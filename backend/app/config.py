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
    APPLE_BUNDLE_ID: str = "com.mattbot.app"
    APPLE_TEAM_ID: str = ""

    EMAIL_PROVIDER: str = "console"
    EMAIL_FROM: str = "noreply@mattbot.app"

    SENTRY_DSN: str = ""
    ENVIRONMENT: str = "development"

    REFRESH_TOKEN_DAYS: int = 30
    ABSOLUTE_SESSION_DAYS: int = 90

    PASSWORD_MIN_LENGTH: int = 12
    PASSWORD_MAX_LENGTH: int = 128

    ACCOUNT_LOCKOUT_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_WINDOW_MINUTES: int = 10
    ACCOUNT_LOCKOUT_DURATION_MINUTES: int = 15

    IP_RATE_LIMIT_REQUESTS: int = 20
    IP_RATE_LIMIT_WINDOW_MINUTES: int = 10

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
