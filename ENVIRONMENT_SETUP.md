# Environment Configuration Setup

## Overview
This project uses environment-specific configuration files to manage different deployment scenarios. All sensitive credentials and environment-specific settings are managed through `.env` files.

## Environment Files

### 1. `.env.dev` (Development)
- **Purpose**: Local development environment
- **Database**: Local PostgreSQL (localhost:5432)
- **Email Provider**: Console (logs to terminal)
- **Billing**: Manual mode (no real Stripe integration)
- **Twilio Provisioning**: Disabled (development only)
- **Features**: Mock/test modes enabled

### 2. `.env.staging` (Staging)
- **Purpose**: Staging/pre-production testing environment
- **Database**: Remote staging PostgreSQL
- **Email Provider**: SendGrid (real email delivery)
- **Billing**: Stripe test mode (sk_test_*)
- **Twilio Provisioning**: Enabled with test credentials
- **Features**: Production-like configuration for testing

### 3. `.env.prod` (Production)
- **Purpose**: Live production environment
- **Database**: Remote production PostgreSQL
- **Email Provider**: SendGrid (real email delivery)
- **Billing**: Stripe live mode (sk_live_*)
- **Twilio Provisioning**: Enabled with production credentials
- **Features**: Optimized for performance and security

### 4. `.env.example` (Reference)
- **Purpose**: Template showing all available configuration options
- **Usage**: Copy from this file as a starting point
- **Contains**: Comprehensive documentation for each setting

## Setup Instructions

### For Local Development

1. Copy `.env.dev` to `.env` in the backend directory:
   ```bash
   cp backend/.env.dev backend/.env
   ```

2. Update placeholder values with your local credentials:
   ```bash
   # Database
   DATABASE_URL=postgresql+asyncpg://mattbot:password@localhost:5432/mattbot_dev?sslmode=disable
   DATABASE_URL_SYNC=postgresql://mattbot:password@localhost:5432/mattbot_dev?sslmode=disable
   
   # Generate new secrets
   JWT_SIGNING_KEY=<your-32-byte-random-key>
   ENCRYPTION_MASTER_KEY=<your-64-char-hex-key>
   ```

3. Run your local backend:
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload
   ```

### For Staging Deployment

1. Copy `.env.staging` to the staging server:
   ```bash
   scp backend/.env.staging user@staging-server:/app/backend/.env
   ```

2. SSH into the staging server and update secrets:
   ```bash
   ssh user@staging-server
   vi /app/backend/.env  # Update all CHANGE_ME fields with real values
   ```

3. Set environment variable:
   ```bash
   export ENVIRONMENT=staging
   ```

### For Production Deployment

1. Copy `.env.prod` to the production server:
   ```bash
   scp backend/.env.prod user@prod-server:/app/backend/.env
   ```

2. SSH into the production server and update secrets:
   ```bash
   ssh user@prod-server
   vi /app/backend/.env  # Update all CHANGE_ME fields with real values
   ```

3. Set environment variable:
   ```bash
   export ENVIRONMENT=production
   ```

## Git Ignore Rules

The `.gitignore` file includes the following patterns to prevent accidental commits of sensitive data:

```
.env              # Local development env file
.env.local        # Local overrides
.env.dev          # Development environment (template)
.env.staging      # Staging environment (template)
.env.prod         # Production environment (template)
.env.*.local      # Any local env overrides
.env.production.local  # Production local overrides
```

## Important Notes

### Security Best Practices

1. **Never commit actual credentials**: The provided `.env.*` files contain placeholder values only.
2. **Use GitHub Secrets**: For CI/CD pipelines, store secrets in GitHub Actions secrets:
   ```
   Settings > Secrets and variables > Actions > New repository secret
   ```
3. **Rotate keys regularly**: In production, rotate encryption and signing keys periodically.
4. **Use managed secrets services**: Consider AWS Secrets Manager, HashiCorp Vault, or similar for production.

### Generating Secret Values

Generate secure random values using Python:

```bash
# JWT_SIGNING_KEY (32-byte hex string = 64 characters)
python -c "import secrets; print(secrets.token_hex(32))"

# ENCRYPTION_MASTER_KEY (same format)
python -c "import secrets; print(secrets.token_hex(32))"

# INTERNAL_EVENT_SECRET
python -c "import secrets; print(secrets.token_hex(32))"

# INTERNAL_NODE_API_KEY
python -c "import secrets; print(secrets.token_hex(32))"
```

### Environment-Specific Behaviors

| Feature | Dev | Staging | Prod |
|---------|-----|---------|------|
| Database SSL | Disabled | Enabled | Enabled |
| Email to Console | Yes | No | No |
| Twilio Provisioning | No | Yes | Yes |
| Stripe Mode | Manual | Test | Live |
| Debug Logging | Verbose | Normal | Minimal |
| Rate Limiting | Loose | Standard | Strict |
| Sentry Sampling | 10% | 50% | 10% |

### Loading Environment Variables

The backend loads environment variables in this order:

1. System environment variables (highest priority)
2. `.env` file in the backend directory
3. Defaults specified in `config.py`

To override a variable without modifying `.env`:

```bash
export DATABASE_URL=postgresql+asyncpg://...
python -m uvicorn app.main:app
```

## Troubleshooting

### "DATABASE_URL not found"
- Ensure `.env` file exists in the backend directory
- Or set the variable: `export DATABASE_URL=...`

### "Connection refused" on database
- Check that PostgreSQL is running on the configured host:port
- For local dev: `psql -h localhost -U mattbot mattbot_dev`

### "Invalid configuration" errors
- Verify all required fields are set (not "CHANGE_ME" placeholders)
- Check syntax of URLs (PostgreSQL connection strings, Redis URLs, etc.)
- Ensure JSON values (like BILLING_PLANS_JSON) are valid JSON

## Docker Support

When using Docker, environment variables can be passed via:

```bash
# Using --env-file
docker run --env-file backend/.env mattbot-backend

# Or in docker-compose.yml
services:
  backend:
    env_file: backend/.env
```

## CI/CD Integration

For GitHub Actions deployment, load secrets as environment variables:

```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  ELEVENLABS_API_KEY: ${{ secrets.ELEVENLABS_API_KEY }}
  # ... etc
```

See `DEVELOPMENT_SETUP.md` for detailed GitHub Actions configuration.
