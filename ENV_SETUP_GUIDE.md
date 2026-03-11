# Environment Configuration Guide

## Quick Start

### For Local Development
```bash
# Backend
cp backend/.env.dev backend/.env

# Mobile
cp mobile/.env.dev mobile/.env

# Realtime Bridge
cp realtime/.env.dev realtime/.env
```

Then update the `CHANGE_ME` placeholders with your actual credentials.

---

## File Structure

```
mattbot/
├── backend/
│   ├── .env.example     # Comprehensive reference (DO NOT EDIT)
│   ├── .env.dev         # Development config (template)
│   ├── .env.staging     # Staging config (template)
│   ├── .env.prod        # Production config (template)
│   └── .env             # Active config (git-ignored, do not commit)
├── mobile/
│   ├── .env.example     # Comprehensive reference (DO NOT EDIT)
│   ├── .env.dev         # Development config (template)
│   ├── .env.staging     # Staging config (template)
│   ├── .env.prod        # Production config (template)
│   └── .env             # Active config (git-ignored, do not commit)
├── realtime/
│   ├── .env.dev         # Development config (template)
│   ├── .env.staging     # Staging config (template)
│   ├── .env.prod        # Production config (template)
│   └── .env             # Active config (git-ignored, do not commit)
└── .gitignore           # Updated to ignore all .env variants
```

---

## Environment Files Overview

### Backend Environment Variables

#### `.env.dev` - Development
- **Database**: Local PostgreSQL (localhost:5432)
- **Email**: Console (development only, prints to terminal)
- **Billing**: Manual mode (no Stripe)
- **Twilio**: Disabled (no provisioning)
- **Features**: Debug logging, loose rate limits, console output
- **Use Case**: Local development, testing locally

#### `.env.staging` - Staging
- **Database**: Remote staging PostgreSQL server
- **Email**: SendGrid (real emails sent)
- **Billing**: Stripe test mode (sk_test_*)
- **Twilio**: Enabled with test credentials
- **Features**: Production-like, test data, performance tuning
- **Use Case**: Pre-production testing, QA environment

#### `.env.prod` - Production
- **Database**: Remote production PostgreSQL server
- **Email**: SendGrid (real emails sent)
- **Billing**: Stripe live mode (sk_live_*)
- **Twilio**: Enabled with live credentials
- **Features**: Optimized performance, minimal logging, Sentry monitoring
- **Use Case**: Live production environment, real users, real money

### Mobile Environment Variables

#### `.env.dev`
```
API_BASE_URL=http://localhost:8000/api/v1
STRIPE_PUBLISHABLE_KEY=pk_test_xxxx
ENVIRONMENT=development
REALTIME_WS_URL=ws://localhost:3001/ws/events
```

#### `.env.staging`
```
API_BASE_URL=https://staging-api.mattbot.app/api/v1
STRIPE_PUBLISHABLE_KEY=pk_test_xxxx
ENVIRONMENT=staging
REALTIME_WS_URL=wss://staging-realtime.mattbot.app/ws/events
```

#### `.env.prod`
```
API_BASE_URL=https://api.mattbot.app/api/v1
STRIPE_PUBLISHABLE_KEY=pk_live_xxxx
ENVIRONMENT=production
REALTIME_WS_URL=wss://realtime.mattbot.app/ws/events
```

### Realtime Node Bridge Environment Variables

#### `.env.dev`
- **LOG_LEVEL**: debug
- **MAX_CONCURRENT_SESSIONS**: 10
- **BACKEND_INTERNAL_URL**: http://localhost:8000

#### `.env.staging`
- **LOG_LEVEL**: info
- **MAX_CONCURRENT_SESSIONS**: 100
- **BACKEND_INTERNAL_URL**: http://backend:8000

#### `.env.prod`
- **LOG_LEVEL**: warn
- **MAX_CONCURRENT_SESSIONS**: 500
- **BACKEND_INTERNAL_URL**: http://backend:8000

---

## Setup Instructions

### 1. Local Development Setup

#### Backend
```bash
cd backend

# Copy development config
cp .env.dev .env

# Edit .env with your local credentials
# Minimal required changes:
# DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@localhost:5432/mattbot_dev?sslmode=disable
# DATABASE_URL_SYNC=postgresql://USER:PASSWORD@localhost:5432/mattbot_dev?sslmode=disable
# JWT_SIGNING_KEY=<run: python -c "import secrets; print(secrets.token_hex(32))">
# ENCRYPTION_MASTER_KEY=<run: python -c "import secrets; print(secrets.token_hex(32))">

# Run migrations
alembic upgrade head

# Start the backend
python -m uvicorn app.main:app --reload
```

#### Mobile
```bash
cd mobile

# Copy development config
cp .env.dev .env

# Start the app
npm start
# or
yarn start
```

#### Realtime Bridge
```bash
cd realtime

# Copy development config
cp .env.dev .env

# Edit .env with ElevenLabs credentials
# Required changes:
# ELEVENLABS_API_KEY=<your-key>
# ELEVENLABS_AGENT_ID=<your-agent-id>

# Start the bridge
npm start
# or
yarn start
```

### 2. Staging Deployment

```bash
# On your staging server
ssh user@staging-server

# Navigate to app directory
cd /app/mattbot

# Pull latest code
git pull origin main

# Copy staging config
cp backend/.env.staging backend/.env

# Edit .env with staging credentials (use secure method)
# Example: use GitHub Secrets if deploying via GitHub Actions
vi backend/.env

# Run migrations
cd backend
alembic upgrade head

# Restart Docker containers
docker-compose down
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 3. Production Deployment

```bash
# On your production server
ssh user@prod-server

# Navigate to app directory
cd /app/mattbot

# Pull latest code
git pull origin main

# Copy production config
cp backend/.env.prod backend/.env

# Edit .env with production credentials (use AWS Secrets Manager or similar)
vi backend/.env

# Run migrations
cd backend
alembic upgrade head

# Restart Docker containers (with health checks)
docker-compose down
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --health-interval=30s
```

---

## Generating Secret Values

### JWT_SIGNING_KEY & ENCRYPTION_MASTER_KEY
```bash
python -c "import secrets; print(secrets.token_hex(32))"
# Output: 64-character hex string
```

### INTERNAL_EVENT_SECRET & INTERNAL_NODE_API_KEY
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### UUID Generation
```bash
python -c "import uuid; print(str(uuid.uuid4()))"
```

---

## Environment-Specific Comparison

| Feature | Dev | Staging | Prod |
|---------|-----|---------|------|
| **Database** | Local (localhost) | Remote RDS | Remote RDS |
| **Database SSL** | Disabled | Enabled | Enabled |
| **Email Provider** | Console | SendGrid | SendGrid |
| **Email Destination** | Terminal | Real recipients | Real recipients |
| **Billing** | Manual (no Stripe) | Stripe Test | Stripe Live |
| **Stripe Keys** | N/A | sk_test_* | sk_live_* |
| **Twilio** | Disabled | Enabled (test) | Enabled (prod) |
| **Rate Limiting** | 1000 req/min | 500 req/min | 100 req/min |
| **Logging** | DEBUG | INFO | WARN |
| **Sentry** | Disabled | Enabled (50%) | Enabled (10%) |
| **Max Sessions** | 10 | 100 | 500 |

---

## GitHub Actions Integration

### Setup Secrets
Go to: **Repository Settings > Secrets and variables > Actions > New repository secret**

Add these secrets for CI/CD deployments:

```
BACKEND_DATABASE_URL_STAGING
BACKEND_DATABASE_URL_PROD
BACKEND_JWT_SIGNING_KEY_STAGING
BACKEND_JWT_SIGNING_KEY_PROD
BACKEND_ENCRYPTION_MASTER_KEY_STAGING
BACKEND_ENCRYPTION_MASTER_KEY_PROD
ELEVENLABS_API_KEY_STAGING
ELEVENLABS_API_KEY_PROD
ELEVENLABS_AGENT_ID_STAGING
ELEVENLABS_AGENT_ID_PROD
STRIPE_SECRET_KEY_STAGING
STRIPE_SECRET_KEY_PROD
TWILIO_ACCOUNT_SID_STAGING
TWILIO_ACCOUNT_SID_PROD
TWILIO_AUTH_TOKEN_STAGING
TWILIO_AUTH_TOKEN_PROD
```

### Example Workflow
```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Create .env file
        run: |
          echo "DATABASE_URL=${{ secrets.BACKEND_DATABASE_URL_STAGING }}" > backend/.env
          echo "JWT_SIGNING_KEY=${{ secrets.BACKEND_JWT_SIGNING_KEY_STAGING }}" >> backend/.env
          # ... add other secrets
      
      - name: Deploy to Staging Server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /app/mattbot
            git pull origin develop
            docker-compose up -d
```

---

## Docker Compose Integration

### Using Environment Files in Docker

#### docker-compose.yml
```yaml
services:
  backend:
    build: ./backend
    env_file: backend/.env
    environment:
      - ENVIRONMENT=${ENVIRONMENT:-development}
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    env_file: backend/.env
    environment:
      POSTGRES_DB: mattbot_dev
      POSTGRES_USER: mattbot
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### Running with Different Environments
```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Staging
docker-compose -f docker-compose.yml -f docker-compose.staging.yml up

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
```

---

## Common Issues & Solutions

### Issue: "DATABASE_URL not found"
**Solution:**
```bash
# Verify .env file exists
ls -la backend/.env

# Or set manually
export DATABASE_URL="postgresql+asyncpg://..."
```

### Issue: "Connection refused" on database
**Solution:**
```bash
# Check if PostgreSQL is running (local dev)
psql -h localhost -U mattbot -d mattbot_dev

# Or check Docker containers
docker ps | grep postgres
```

### Issue: "CHANGE_ME" placeholder still in env
**Solution:**
```bash
# Generate a proper secret
python -c "import secrets; print(secrets.token_hex(32))"

# Update .env
sed -i 's/CHANGE_ME.*/YOUR_NEW_VALUE/' backend/.env
```

### Issue: Environment file permissions
**Solution:**
```bash
# On production servers, restrict permissions
chmod 600 backend/.env
chown app:app backend/.env
```

---

## Security Best Practices

### Do's ✅
- ✅ Generate strong random keys for production
- ✅ Use GitHub Secrets for CI/CD credentials
- ✅ Rotate keys periodically (especially encryption keys)
- ✅ Use SSL/TLS for database connections (production)
- ✅ Store `.env` files with restricted permissions (`chmod 600`)
- ✅ Use different credentials for each environment
- ✅ Audit `.gitignore` to ensure no secrets are committed

### Don'ts ❌
- ❌ Never commit `.env` files to git
- ❌ Never share production credentials via Slack/Email
- ❌ Never use weak keys (like "password" or "123456")
- ❌ Never copy-paste production credentials into local dev
- ❌ Never disable SSL for production databases
- ❌ Never log sensitive values to stdout

---

## Troubleshooting Checklist

- [ ] `.env` file exists in correct directory
- [ ] All required variables are set (no "CHANGE_ME" left)
- [ ] Database connection string is valid and server is running
- [ ] External services (Stripe, ElevenLabs, Twilio) are accessible
- [ ] File permissions are correct (`chmod 600` on production)
- [ ] Environment matches what the code expects
- [ ] No secrets accidentally committed to git

---

## References

- Backend config: See `backend/.env.example` for comprehensive documentation
- Mobile config: See `mobile/.env.example` for all available options
- Docker setup: See `docker-compose.yml` for container configuration
- GitHub Actions: See `.github/workflows/*` for CI/CD pipeline details

---

## Next Steps

1. **Copy environment files**: `cp .env.dev .env` in each service directory
2. **Update placeholders**: Replace "CHANGE_ME" and "your-*" values
3. **Verify credentials**: Test database/external service connections
4. **Run migrations**: `alembic upgrade head` in backend
5. **Start services**: Run `docker-compose up` or start manually
6. **Test locally**: Verify all features work with your configuration
