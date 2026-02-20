# MattBot

Phase 1 MVP: A phone concierge that answers calls when the user is busy, screens callers, and delivers clear summaries.

## Monorepo Structure

| Directory   | Purpose                              |
|-------------|--------------------------------------|
| `backend/`  | FastAPI core service (Python 3.12+)  |
| `mobile/`   | React Native app (iOS + Android)     |
| `portal/`   | Next.js admin portal (future)        |
| `realtime/` | Node.js media bridge (future)        |
| `infra/`    | IaC and deployment scripts (future)  |
| `docs/`     | Planning documents and runbooks      |

## Quick Start

### Backend

```bash
cd backend

# Create venv and install deps
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Set up .env with your credentials
cp .env.example .env
# Edit .env and add:
# - DATABASE_URL (PostgreSQL connection string)
# - REDIS_URL (Redis connection string)
# - JWT_SIGNING_KEY (generate random 32-byte key)
# - ENCRYPTION_MASTER_KEY (generate random 64-char hex)

# Run linter
ruff check app/ tests/

# Run type checker
mypy app/

# Run tests
pytest -v --tb=short

# Start dev server
uvicorn app.main:app --reload --port 8000
```

### Mobile

```bash
cd mobile

# Install dependencies
npm install

# Set up .env
cp .env.example .env
# Edit .env if needed (API_BASE_URL for dev vs production)

# Run linter
npx eslint . --ext .ts,.tsx

# Run tests
npm test

# Start Metro bundler (for development)
npx react-native start
```

## Environment Variables

### Backend (.env)

```
DATABASE_URL=postgresql+asyncpg://...
DATABASE_URL_SYNC=postgresql://...
REDIS_URL=redis://...
JWT_SIGNING_KEY=<32 random bytes, base64-encoded>
JWT_KEY_ID=key-001
ENCRYPTION_MASTER_KEY=<64-char hex string>
GOOGLE_CLIENT_ID=<your-google-client-id>
APPLE_BUNDLE_ID=com.mattbot.app
APPLE_TEAM_ID=<your-apple-team-id>
EMAIL_PROVIDER=console|sendgrid
EMAIL_FROM=noreply@mattbot.app
SENTRY_DSN=<optional-sentry-url>
ENVIRONMENT=development|staging|production
```

### Mobile (.env)

```
API_BASE_URL=http://localhost:8000/api/v1
GOOGLE_WEB_CLIENT_ID=<your-google-web-client-id>
SENTRY_DSN=<optional-sentry-url>
ENVIRONMENT=development
```

## Running Tests

```bash
# Backend
cd backend && pytest -v --tb=short

# Mobile
cd mobile && npm test
```

## Generate Secrets

```bash
# JWT signing key (32 bytes)
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Encryption master key (64-char hex)
python3 -c "import secrets; print(secrets.token_hex(32))"
```
