# Environment Files Setup - Summary

## What Was Created

### Environment Files by Location

#### Backend (`backend/`)
- `backend/.env.dev` - Development environment (local PostgreSQL, console email)
- `backend/.env.staging` - Staging environment (remote DB, SendGrid, Stripe test)
- `backend/.env.prod` - Production environment (remote DB, SendGrid, Stripe live)
- `backend/.env.example` - Reference template with full documentation

#### Mobile (`mobile/`)
- `mobile/.env.dev` - Development environment (local API, test Stripe key)
- `mobile/.env.staging` - Staging environment (staging API, test Stripe key)
- `mobile/.env.prod` - Production environment (production API, live Stripe key)
- `mobile/.env.example` - Reference template with full documentation

#### Realtime Node Bridge (`realtime/`)
- `realtime/.env.dev` - Development environment (debug logging, 10 max sessions)
- `realtime/.env.staging` - Staging environment (info logging, 100 max sessions)
- `realtime/.env.prod` - Production environment (warn logging, 500 max sessions)

### Documentation Files
- `ENVIRONMENT_SETUP.md` - Comprehensive environment configuration guide
- `ENV_SETUP_GUIDE.md` - Quick start guide with troubleshooting

### Git Configuration
- Updated `.gitignore` to include:
  - `.env` - Active environment file (git-ignored)
  - `.env.dev` - Development template
  - `.env.staging` - Staging template
  - `.env.prod` - Production template
  - `.env.local` - Local overrides
  - `.env.*.local` - Environment-specific local overrides

---

## How to Use

### Quick Start for Development

```bash
# Backend
cd backend
cp .env.dev .env
# Edit .env and replace CHANGE_ME placeholders with actual values
python -m uvicorn app.main:app --reload

# Mobile (in another terminal)
cd mobile
cp .env.dev .env
npm start

# Realtime Bridge (in another terminal)
cd realtime
cp .env.dev .env
npm start
```

### For Staging Deployment

```bash
# On staging server
cd /path/to/mattbot

# Backend
cd backend
cp .env.staging .env
# Update all placeholders with staging credentials
# Then run: alembic upgrade head

# Other services
cd ../mobile && cp .env.staging .env
cd ../realtime && cp .env.staging .env
```

### For Production Deployment

```bash
# On production server
cd /path/to/mattbot

# Backend
cd backend
cp .env.prod .env
# Update all placeholders with production credentials
# Use strong, random keys generated with:
#   python -c "import secrets; print(secrets.token_hex(32))"
# Then run: alembic upgrade head

# Other services
cd ../mobile && cp .env.prod .env
cd ../realtime && cp .env.prod .env
```

---

## File Organization

```
mattbot/
├── backend/
│   ├── .env              # ← Copy from .env.dev/.env.staging/.env.prod
│   ├── .env.dev          # ← Development template (all placeholders)
│   ├── .env.staging      # ← Staging template (all placeholders)
│   ├── .env.prod         # ← Production template (all placeholders)
│   ├── .env.example      # ← Full documentation reference
│   └── [other backend files]
├── mobile/
│   ├── .env              # ← Copy from .env.dev/.env.staging/.env.prod
│   ├── .env.dev          # ← Development template (all placeholders)
│   ├── .env.staging      # ← Staging template (all placeholders)
│   ├── .env.prod         # ← Production template (all placeholders)
│   ├── .env.example      # ← Full documentation reference
│   └── [other mobile files]
├── realtime/
│   ├── .env              # ← Copy from .env.dev/.env.staging/.env.prod
│   ├── .env.dev          # ← Development template (all placeholders)
│   ├── .env.staging      # ← Staging template (all placeholders)
│   ├── .env.prod         # ← Production template (all placeholders)
│   └── [other realtime files]
├── .gitignore            # ← Updated to ignore .env variants
├── ENVIRONMENT_SETUP.md  # ← Detailed setup guide
├── ENV_SETUP_GUIDE.md    # ← Quick start guide
└── [other project files]
```

---

## What Each File Contains

### Backend Environment Variables

**Database Configuration:**
- `DATABASE_URL` - Async PostgreSQL connection string (asyncpg driver)
- `DATABASE_URL_SYNC` - Sync PostgreSQL connection string (psycopg driver)
- `REDIS_URL` - Redis connection for sessions and caching

**Security:**
- `JWT_SIGNING_KEY` - Secret for signing JWT tokens
- `ENCRYPTION_MASTER_KEY` - Master encryption key for sensitive fields
- `INTERNAL_EVENT_SECRET` - HMAC secret for internal events
- `INTERNAL_NODE_API_KEY` - API key for Node bridge communication

**AI & Integrations:**
- `ELEVENLABS_API_KEY` - ElevenLabs API credentials
- `ELEVENLABS_AGENT_ID` - Agent ID for conversational AI
- `TWILIO_ACCOUNT_SID` - Twilio account credentials
- `TWILIO_AUTH_TOKEN` - Twilio authentication token
- `STRIPE_SECRET_KEY` - Stripe API secret (test or live)

**Plus 40+ more configuration options** - See `backend/.env.example` for complete list

### Mobile Environment Variables

- `API_BASE_URL` - Backend API endpoint
- `GOOGLE_WEB_CLIENT_ID` - Google OAuth credentials
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (test or live)
- `SENTRY_DSN` - Error tracking (optional)
- `REALTIME_WS_URL` - WebSocket URL for real-time events
- `ENVIRONMENT` - Environment indicator (development, staging, production)

### Realtime Node Bridge Environment Variables

- `PORT` - Server port (default: 3001)
- `ELEVENLABS_API_KEY` - ElevenLabs credentials
- `ELEVENLABS_AGENT_ID` - Agent ID
- `JWT_SIGNING_KEY` - JWT secret
- `LOG_LEVEL` - Logging verbosity (debug, info, warn)
- `MAX_CONCURRENT_SESSIONS` - Max concurrent connections allowed

---

## Important Notes

### Security Best Practices

1. **Never commit `.env` files**: Always use `.gitignore` to prevent accidental commits
2. **All `.env*` files are git-ignored**: The repository will never track actual credentials
3. **Use strong random keys**: Generate with `python -c "import secrets; print(secrets.token_hex(32))"`
4. **Different credentials per environment**: Never reuse production keys in development
5. **Use GitHub Secrets for CI/CD**: Store deployment credentials in GitHub Actions Secrets

### File Naming Convention

- `.env` - **ACTIVE** environment file (git-ignored, do not commit)
- `.env.dev` - Development template with placeholder values
- `.env.staging` - Staging template with placeholder values
- `.env.prod` - Production template with placeholder values
- `.env.example` - Reference documentation (DO NOT EDIT)
- `.env.local` - Local overrides (git-ignored, for personal customizations)
- `.env.*.local` - Environment-specific local overrides

### Placeholder Values

All template files (`.env.dev`, `.env.staging`, `.env.prod`) contain placeholder values:
- `CHANGE_ME_*` - Indicates a value that MUST be replaced
- `your-*` - Indicates a template value to be replaced
- `SG.xxxx`, `sk_test_xxxx`, `pk_test_xxxx` - Example formats

**Always replace these before running in any environment.**

---

## Next Steps

1. **Choose your environment**: dev, staging, or prod
2. **Copy the appropriate template**: `cp .env.XXX .env` in each service directory
3. **Update placeholders**: Edit each `.env` file and replace all `CHANGE_ME` and `your-*` values
4. **Verify connectivity**: Test database, Redis, and external service connections
5. **Run migrations** (backend): `alembic upgrade head`
6. **Start services**: Run backend, mobile, and realtime bridge

---

## Files Created

### Environment Configuration Files (9 files)
✅ `backend/.env.dev`
✅ `backend/.env.staging`
✅ `backend/.env.prod`
✅ `mobile/.env.dev`
✅ `mobile/.env.staging`
✅ `mobile/.env.prod`
✅ `realtime/.env.dev`
✅ `realtime/.env.staging`
✅ `realtime/.env.prod`

### Documentation Files (2 files)
✅ `ENVIRONMENT_SETUP.md` - Comprehensive setup guide
✅ `ENV_SETUP_GUIDE.md` - Quick start guide

### Updated Files (1 file)
✅ `.gitignore` - Updated to ignore environment files

---

## Troubleshooting

### "DATABASE_URL not found"
→ Ensure `.env` file exists and contains `DATABASE_URL`

### "Connection refused" on database
→ Check database is running and connection string is correct

### "CHANGE_ME" error at runtime
→ Replace all `CHANGE_ME_*` placeholders with actual values

### Environment file not loading
→ Ensure file is named exactly `.env` (not `.env.dev`, etc.)

### Git still tracking `.env`
→ Run `git rm --cached .env` to untrack the file

---

## Reference Links

- Detailed Configuration: See `ENVIRONMENT_SETUP.md`
- Quick Start Guide: See `ENV_SETUP_GUIDE.md`
- Backend Config Reference: See `backend/.env.example`
- Mobile Config Reference: See `mobile/.env.example`
- Repository Structure: See main `README.md`

---

## Summary

All environment files are now in place with:
- ✅ Three deployment configurations per service (dev, staging, prod)
- ✅ All placeholders marked clearly for easy identification
- ✅ Comprehensive documentation for setup
- ✅ Git ignore rules to prevent credential leaks
- ✅ Quick start guide for immediate use

You're ready to deploy! 🚀
