# MattBot Test Commands

## Backend (Python / FastAPI)

```bash
cd backend

# Create virtualenv and install dependencies
python -m venv .venv
source .venv/bin/activate          # Linux/Mac
# .venv\Scripts\activate           # Windows
pip install -e ".[dev]"

# Run all tests
pytest -v --tb=short

# Run specific test modules
pytest tests/test_billing.py -v
pytest tests/test_billing_config.py -v
pytest tests/test_billing_usage.py -v
pytest tests/test_telephony.py -v
pytest tests/test_number_lifecycle.py -v
pytest tests/test_theme.py -v
pytest tests/test_auth.py -v
pytest tests/test_mfa.py -v
pytest tests/test_settings.py -v
pytest tests/test_onboarding.py -v

# Linting
ruff check app/ tests/

# Type checking
mypy app/

# Run with coverage
pytest --cov=app --cov-report=term-missing
```

## Database Migrations

```bash
cd backend

# Generate a new migration
alembic revision --autogenerate -m "description"

# Apply all migrations
alembic upgrade head

# Check current migration state
alembic current
```

## Mobile (React Native)

```bash
cd mobile

# Install dependencies
npm install

# Linting
npx eslint . --ext .ts,.tsx

# Type checking
npx tsc --noEmit

# Run tests
npm test

# Start Metro bundler
npx react-native start

# Run on device/emulator
npx react-native run-ios
npx react-native run-android
```

## Android APK Build

```bash
cd mobile/android

# Debug APK
./gradlew assembleDebug

# Release APK
./gradlew assembleRelease
```

## Backend Dev Server

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Stripe CLI (Local Webhook Testing)

```bash
stripe listen --forward-to localhost:8000/webhooks/stripe
```

## Environment

Backend tests use SQLite in-memory (no external services needed).
Set `BILLING_PROVIDER=manual` for local development without Stripe.
Set `TWILIO_NUMBER_PROVISIONING_ENABLED=false` for simulated number provisioning.
