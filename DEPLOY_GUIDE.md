# MattBot Dev Server Deployment -- Dumb Step-by-Step Guide

> This guide assumes you know NOTHING. Every click, every command, every value is spelled out.
> You are deploying the **dev server** on **AWS EC2** with **GitHub Actions** auto-deploy.

---

## TABLE OF CONTENTS

1. [PART 1: Create the EC2 Instance (AWS Console)](#part-1-create-the-ec2-instance)
2. [PART 2: Connect to Your EC2 Server](#part-2-connect-to-your-ec2-server)
3. [PART 3: Install Docker on the Server](#part-3-install-docker-on-the-server)
4. [PART 4: Clone Your Repo on the Server](#part-4-clone-your-repo-on-the-server)
5. [PART 5: Set Up Your Database (Aiven PostgreSQL)](#part-5-set-up-your-database)
6. [PART 6: Create the .env Files on the Server](#part-6-create-the-env-files-on-the-server)
7. [PART 7: First Manual Deploy (Test It Works)](#part-7-first-manual-deploy)
8. [PART 8: Set Up GitHub Secrets](#part-8-set-up-github-secrets)
9. [PART 9: Test the Auto-Deploy](#part-9-test-the-auto-deploy)
10. [PART 10: Set Up SSL (HTTPS) -- Optional but Recommended](#part-10-set-up-ssl)
11. [PART 11: Point Your Domain to EC2](#part-11-point-your-domain)
12. [PART 12: Verify Everything Works](#part-12-verify-everything-works)
13. [TROUBLESHOOTING](#troubleshooting)

---

## PART 1: Create the EC2 Instance

### Step 1.1 -- Log into AWS
1. Go to https://console.aws.amazon.com
2. Sign in with your AWS account
3. In the top-right corner, select a **region** close to your users (e.g., `us-east-1`)

### Step 1.2 -- Launch an EC2 Instance
1. In the search bar at the top, type **EC2** and click on it
2. Click the orange **"Launch instance"** button

### Step 1.3 -- Configure the Instance
Fill in these fields:

| Field | Value |
|-------|-------|
| **Name** | `mattbot-dev` |
| **OS Image (AMI)** | Ubuntu Server 24.04 LTS (Free tier eligible) |
| **Architecture** | 64-bit (x86) |
| **Instance type** | `t3.small` (2 vCPU, 2 GB RAM) -- minimum for running Docker |
| **Key pair** | Click "Create new key pair" (see step 1.4) |

> **Why t3.small?** The `t2.micro` (free tier) only has 1 GB RAM, which is NOT enough for Docker + Python + Node. `t3.small` costs about ~$15/month and has 2 GB RAM which is the minimum.

### Step 1.4 -- Create a Key Pair
1. Click **"Create new key pair"**
2. Fill in:
   - **Key pair name**: `mattbot-dev-key`
   - **Key pair type**: RSA
   - **Private key file format**: `.pem`
3. Click **"Create key pair"**
4. A file called `mattbot-dev-key.pem` will download to your computer
5. **SAVE THIS FILE SOMEWHERE SAFE** -- you need it to connect to the server AND for GitHub Actions

### Step 1.5 -- Configure Security Group (Firewall)
Under **"Network settings"**, click **"Edit"** and add these rules:

| Type | Port Range | Source | Description |
|------|-----------|--------|-------------|
| SSH | 22 | My IP (or 0.0.0.0/0 for anywhere) | SSH access |
| HTTP | 80 | 0.0.0.0/0 (Anywhere) | Web traffic |
| HTTPS | 443 | 0.0.0.0/0 (Anywhere) | Secure web traffic |
| Custom TCP | 8000 | 0.0.0.0/0 (Anywhere) | Backend API (direct) |
| Custom TCP | 3001 | 0.0.0.0/0 (Anywhere) | Realtime bridge (direct) |

> **Security note**: For production, you'd restrict these more. For dev, this is fine.

### Step 1.6 -- Configure Storage
- Set **storage** to at least **20 GB** (gp3)

### Step 1.7 -- Launch!
1. Click **"Launch instance"**
2. Wait for the status to show **"Running"** (about 1-2 minutes)
3. Click on the instance ID to see its details
4. **Copy the "Public IPv4 address"** -- you'll need this everywhere. Example: `54.123.45.67`

---

## PART 2: Connect to Your EC2 Server

#### Step 2.1 -- Set key file permissions
```bash
# Navigate to where your key file is (probably Downloads)
cd ~/Downloads

# Move it somewhere better
mkdir -p ~/.ssh
cp mattbot-dev-key.pem ~/.ssh/mattbot-dev-key.pem

# Set correct permissions (SSH requires this)
chmod 600 ~/.ssh/mattbot-dev-key.pem
```

#### Step 2.2 -- Connect via SSH
```bash
ssh -i ~/.ssh/mattbot-dev-key.pem ubuntu@YOUR_EC2_IP
```

Replace `YOUR_EC2_IP` with the actual IP from Step 1.7.

**Example:**
```bash
ssh -i ~/.ssh/mattbot-dev-key.pem ubuntu@3.238.82.209
```

When it asks "Are you sure you want to continue connecting?", type **yes** and press Enter.

You should now see something like:
```
ubuntu@ip-172-31-XX-XX:~$
```

**You are now on the EC2 server!**

---

## PART 3: Install Docker on the Server

Run these commands one by one. Copy-paste each line.

### Step 3.1 -- Update system
```bash
sudo apt-get update -y && sudo apt-get upgrade -y
```
(This takes 1-2 minutes. Wait for it to finish.)

### Step 3.2 -- Install Docker prerequisites
```bash
sudo apt-get install -y ca-certificates curl gnupg lsb-release
```

### Step 3.3 -- Add Docker's official GPG key
```bash
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
```

### Step 3.4 -- Add Docker repository
```bash
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

### Step 3.5 -- Install Docker
```bash
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

### Step 3.6 -- Let your user run Docker without sudo
```bash
sudo usermod -aG docker $USER
```

### Step 3.7 -- Apply the group change
```bash
# Log out
exit

# Log back in (run the SSH command again from your local machine)
ssh -i ~/.ssh/mattbot-dev-key.pem ubuntu@YOUR_EC2_IP
```

### Step 3.8 -- Verify Docker works
```bash
docker --version
docker compose version
```

You should see something like:
```
Docker version 27.x.x
Docker Compose version v2.x.x
```

---

## PART 4: Clone Your Repo on the Server

### Step 4.1 -- Install Git (usually pre-installed on Ubuntu)
```bash
sudo apt-get install -y git
```

### Step 4.2 -- Clone the repository
```bash
cd ~
git clone https://github.com/YOUR_USERNAME/mattbot.git
cd mattbot
```

> **If the repo is private**, you need a Personal Access Token:
> 1. Go to https://github.com/settings/tokens
> 2. Click "Generate new token (classic)"
> 3. Give it a name like "mattbot-deploy"
> 4. Check the **"repo"** scope
> 5. Click "Generate token"
> 6. **Copy the token** (you won't see it again!)
> 7. Clone using: `git clone https://YOUR_TOKEN@github.com/YOUR_USERNAME/mattbot.git`

### Step 4.3 -- Verify the code is there
```bash
ls -la
```

You should see: `backend/`, `realtime/`, `mobile/`, `docker-compose.yml`, `nginx/`, etc.

---

## PART 5: Set Up Your Database

You mentioned you're using **Aiven PostgreSQL**. You already have this connection string:
```
postgres://avnadmin:***AIVEN_PASSWORD_REDACTED***@pg-34770840-ai-caller.g.aivencloud.com:21162/defaultdb
```

### Step 5.1 -- Convert the connection strings

You need TWO versions of this URL:

**For DATABASE_URL (async -- used by the app):**
```
postgresql+asyncpg://avnadmin:***AIVEN_PASSWORD_REDACTED***@pg-34770840-ai-caller.g.aivencloud.com:21162/defaultdb?ssl=require
```
> Changed `postgres://` to `postgresql+asyncpg://` and added `?ssl=require`

**For DATABASE_URL_SYNC (sync -- used by Alembic migrations):**
```
postgresql://avnadmin:***AIVEN_PASSWORD_REDACTED***@pg-34770840-ai-caller.g.aivencloud.com:21162/defaultdb?sslmode=require
```
> Changed `postgres://` to `postgresql://` and added `?sslmode=require`

---

## PART 6: Create the .env Files on the Server

### Step 6.1 -- Generate secret keys

Run this on the server to generate 3 random keys. **Write them down!**

```bash
echo "JWT_SIGNING_KEY:"
python3 -c "import secrets; print(secrets.token_hex(32))"

echo "ENCRYPTION_MASTER_KEY:"
python3 -c "import secrets; print(secrets.token_hex(32))"

echo "INTERNAL_EVENT_SECRET:"
python3 -c "import secrets; print(secrets.token_hex(32))"

echo "INTERNAL_NODE_API_KEY:"
python3 -c "import secrets; print(secrets.token_hex(32))"
```

**Copy all 4 values and save them somewhere!** You need them below AND in GitHub Secrets later.

### Step 6.2 -- Create backend .env

```bash
cd ~/mattbot
vim backend/.env
```

Paste this entire block, but **replace the placeholder values** with your actual values:

```env
DATABASE_URL=postgresql+asyncpg://avnadmin:***AIVEN_PASSWORD_REDACTED***@pg-34770840-ai-caller.g.aivencloud.com:21162/defaultdb?ssl=require
DATABASE_URL_SYNC=postgresql://avnadmin:***AIVEN_PASSWORD_REDACTED***@pg-34770840-ai-caller.g.aivencloud.com:21162/defaultdb?sslmode=require
REDIS_URL=redis://localhost:6379
JWT_SIGNING_KEY=PASTE_YOUR_GENERATED_KEY_HERE
JWT_KEY_ID=key-dev-001
ENCRYPTION_MASTER_KEY=PASTE_YOUR_GENERATED_KEY_HERE
GOOGLE_CLIENT_ID=
APPLE_BUNDLE_ID=com.mattbot.app
APPLE_TEAM_ID=
EMAIL_PROVIDER=console
EMAIL_FROM=noreply@mattbot.app
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
APP_LINK_BASE_URL=http://YOUR_EC2_IP:8000
BILLING_PROVIDER=manual
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_FREE=
STRIPE_PRICE_STANDARD=
STRIPE_PRICE_PRO=
BILLING_PLANS_JSON=[{"code":"free","name":"Free","price_usd":"0.00","included_minutes":10,"requires_credit_card":true,"limited":true,"sort_order":0,"description":"Try MattBot","icon":"gift-outline"},{"code":"standard","name":"Standard","price_usd":"20.00","included_minutes":100,"sort_order":1,"description":"For everyday use","icon":"star-outline"},{"code":"pro","name":"Pro","price_usd":"50.00","included_minutes":400,"sort_order":2,"description":"High-volume coverage","icon":"rocket-launch-outline"}]
BILLING_UPGRADE_RULES_JSON=[{"from_plan":"free","to_plan":"standard","trigger":"minutes_exceeded"}]
STRIPE_PRICE_IDS_JSON={"free":"","standard":"","pro":""}
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_NUMBER_PROVISIONING_ENABLED=false
TWILIO_WEBHOOK_BASE_URL=http://YOUR_EC2_IP
HANDOFF_CALLER_ID=
ELEVENLABS_API_KEY=PASTE_YOUR_ELEVENLABS_KEY
ELEVENLABS_AGENT_ID=PASTE_YOUR_AGENT_ID
ELEVENLABS_WEBHOOK_SECRET=
ELEVENLABS_DEFAULT_VOICE_ID=
ELEVENLABS_API_BASE_URL=https://api.elevenlabs.io/v1/convai/conversations
NODE_BRIDGE_WS_URL=ws://YOUR_EC2_IP:3001/twilio/media
NODE_BRIDGE_INTERNAL_URL=http://realtime:3001
ENABLE_REALTIME_BRIDGE=true
INTERNAL_EVENT_SECRET=PASTE_YOUR_GENERATED_KEY_HERE
INTERNAL_NODE_API_KEY=PASTE_YOUR_GENERATED_KEY_HERE
SENTRY_DSN=
ENVIRONMENT=development
API_BASE_URL=http://YOUR_EC2_IP:8000
AGENT_DEFAULT_SYSTEM_PROMPT_KEY=default_v1
DEFAULT_ASSISTANT_NAME=Alex
FCM_SERVICE_ACCOUNT_JSON=/app/firebase-service-account.json
```

**To save in nano:** Press `Ctrl+X`, then `Y`, then `Enter`.

### Step 6.3 -- Copy the Firebase service account JSON

The file `backend/firebase-service-account.json` is needed for push notifications. Copy it to the server:

**Option A -- From your local machine (new terminal window, NOT on the server):**
```bash
scp -i ~/.ssh/mattbot-dev-key.pem ./backend/firebase-service-account.json ubuntu@YOUR_EC2_IP:~/mattbot/backend/firebase-service-account.json
```

**Option B -- Create it manually on the server:**
```bash
nano ~/mattbot/backend/firebase-service-account.json
```
Then paste the entire JSON contents and save (`Ctrl+X`, `Y`, `Enter`).

### Step 6.4 -- Create realtime .env

```bash
nano realtime/.env
```

Paste this:

```env
PORT=3001
ELEVENLABS_API_KEY=PASTE_YOUR_ELEVENLABS_KEY
ELEVENLABS_AGENT_ID=PASTE_YOUR_AGENT_ID
INTERNAL_EVENT_SECRET=PASTE_SAME_KEY_AS_BACKEND
INTERNAL_NODE_API_KEY=PASTE_SAME_KEY_AS_BACKEND
JWT_SIGNING_KEY=PASTE_SAME_KEY_AS_BACKEND
LOG_LEVEL=info
BACKEND_INTERNAL_URL=http://backend:8000
MAX_CONCURRENT_SESSIONS=50
MAX_SESSIONS_PER_USER=5
ELEVENLABS_WS_URL=wss://api.elevenlabs.io/v1/convai/conversation
ELEVENLABS_BUFFER_LIMIT_BYTES=512000
WS_AUTH_TIMEOUT_MS=5000
AGENT_RUNTIME_FETCH_TIMEOUT_MS=5000
EVENT_EMISSION_TIMEOUT_MS=10000
HANDOFF_DECISION_TIMEOUT_MS=10000
```

> **IMPORTANT:** The `JWT_SIGNING_KEY`, `INTERNAL_EVENT_SECRET`, and `INTERNAL_NODE_API_KEY` must be the **SAME values** in both backend and realtime .env files!

Save: `Ctrl+X`, `Y`, `Enter`.

---

## PART 7: First Manual Deploy (Test It Works)

### Step 7.1 -- Create SSL placeholder directories
```bash
cd ~/mattbot
mkdir -p nginx/ssl nginx/certbot/conf nginx/certbot/www
```

### Step 7.2 -- Build and start everything
```bash
cd ~/mattbot
docker compose up -d --build
```

This will:
- Build the backend Docker image (takes 2-5 minutes first time)
- Build the realtime bridge Docker image
- Start Redis
- Start Nginx
- Run Alembic migrations automatically
- Start the backend API
- Start the realtime bridge

### Step 7.3 -- Watch the build progress
```bash
docker compose logs -f
```

Press `Ctrl+C` to stop watching logs.

### Step 7.4 -- Check that all containers are running
```bash
docker compose ps
```

You should see ALL containers with status **"Up"** or **"Up (healthy)"**:
```
NAME               STATUS
mattbot-backend    Up (healthy)
mattbot-realtime   Up (healthy)
mattbot-redis      Up (healthy)
mattbot-nginx      Up
mattbot-certbot    Up
```

### Step 7.5 -- Test the API
```bash
# Test backend directly
curl http://localhost:8000/health

# Test through nginx
curl http://localhost/health

# Test from outside (use your EC2 IP)
# Open in your browser: http://YOUR_EC2_IP/health
```

You should see a JSON response like `{"status": "ok"}` or similar.

**If something is wrong**, check logs:
```bash
# All logs
docker compose logs

# Just backend logs
docker compose logs backend

# Just realtime logs
docker compose logs realtime

# Just nginx logs
docker compose logs nginx
```

---

## PART 8: Set Up GitHub Environments & Secrets

Secrets are scoped per **environment** (dev, staging, production). Each environment gets its own server credentials and `.env` files. You only need **dev** right now — add staging and production later when you have those servers.

### Step 8.1 -- Create GitHub Environments

1. Go to your repo on GitHub: `https://github.com/YOUR_USERNAME/mattbot`
2. Click **"Settings"** tab (at the top)
3. In the left sidebar, click **"Environments"**
4. Click **"New environment"**
5. Create these three environments (you can add staging/production later):

| Environment | Branch trigger | Protection |
|-------------|---------------|------------|
| `dev` | `main` (auto-deploy on push) | None |
| `staging` | `staging` (auto-deploy on push) | None (optional: add reviewers) |
| `production` | `prod` (auto-deploy on push) | **Required reviewers** (add yourself) |

> **For now**, just create `dev`. You can add `staging` and `production` later when you have those servers.

### Step 8.2 -- Add secrets to the `dev` environment

1. Click on the `dev` environment you just created
2. Under **"Environment secrets"**, click **"Add secret"**
3. Add these 6 secrets **one by one** (same names for every environment, different values):

| # | Secret Name | What it is |
|---|-------------|------------|
| 1 | `EC2_HOST` | Your EC2 Public IPv4 address (e.g. `54.123.45.67`) |
| 2 | `EC2_USER` | Always `ubuntu` |
| 3 | `EC2_SSH_KEY` | Full contents of your `.pem` file (see step 8.3) |
| 4 | `BACKEND_ENV` | Entire backend `.env` file contents (see step 8.4) |
| 5 | `REALTIME_ENV` | Entire realtime `.env` file contents (see step 8.5) |
| 6 | `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase service account JSON (see step 8.6) |

> **When you add staging/production later:** Create those environments in GitHub, then add the same 6 secret names with that environment's values (different server IP, different DB, different API keys, `ENVIRONMENT=staging` or `ENVIRONMENT=production` in the `.env`, etc.)

### How deploys are triggered

| Push to branch | Deploys to environment | Workflow file |
|----------------|----------------------|---------------|
| `main` | dev | `deploy-dev.yml` |
| `staging` | staging | `deploy-staging.yml` |
| `prod` | production | `deploy-prod.yml` |

All three workflows use a shared `deploy.yml` reusable workflow — you never need to duplicate deploy logic.

### Step 8.3 -- How to get the EC2 SSH Key (`EC2_SSH_KEY`)

The `.pem` file you downloaded when you created the EC2 instance IS the SSH private key. GitHub Actions uses it to SSH into your server during deploy.

**How it works:** GitHub Actions takes this key, saves it temporarily on the CI runner, uses it to connect to your EC2 via SSH, runs commands, then discards it. The key never leaves GitHub's encrypted secrets storage.

1. On your local machine, open a terminal
2. Run this to print the full key:

```bash
cat ~/.ssh/mattbot-dev-key.pem
```

3. **Copy EVERYTHING** that appears -- the entire block including the first and last lines:

```
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA1234567890abcdef...
(many lines of random characters)
...abcdef1234567890
-----END RSA PRIVATE KEY-----
```

4. Go to GitHub > Your repo > Settings > Environments > `dev`
5. Under "Environment secrets", click "Add secret"
6. Name: `EC2_SSH_KEY`
7. Value: Paste the ENTIRE key (all lines, including the `-----BEGIN` and `-----END` lines)
8. Click "Add secret"

> **Do NOT** modify the key in any way. No extra spaces, no missing newlines. Paste it exactly as-is.

### Step 8.4 -- Backend .env (`BACKEND_ENV`)

Instead of adding each backend variable as a separate secret, paste the **entire `.env` file** as one secret.

1. Open `backend/.env.dev` in your editor (this is the reference config with all variables)
2. Copy **everything** (all lines — comments are fine, GitHub will store them as-is)
3. Go to GitHub > Your repo > Settings > Environments > `dev`
4. Under "Environment secrets", click "Add secret"
5. Name: `BACKEND_ENV`
6. Value: Paste the entire `.env.dev` contents
7. Click "Add secret"

> **Tip:** Before pasting, update any placeholder values like `YOUR_EC2_IP` with your actual EC2 IP address. The file `backend/.env.dev` already has working dev values for most things.

> **To update later:** Just edit the `BACKEND_ENV` secret in GitHub Settings > Secrets — no workflow changes needed.

### Step 8.5 -- Realtime .env (`REALTIME_ENV`)

Same idea for the realtime bridge. Paste this as the secret value (replace placeholders with your actual values):

```env
PORT=3001
ELEVENLABS_API_KEY=YOUR_ELEVENLABS_API_KEY
ELEVENLABS_AGENT_ID=YOUR_ELEVENLABS_AGENT_ID
INTERNAL_EVENT_SECRET=YOUR_INTERNAL_EVENT_SECRET
INTERNAL_NODE_API_KEY=YOUR_INTERNAL_NODE_API_KEY
JWT_SIGNING_KEY=YOUR_JWT_SIGNING_KEY
LOG_LEVEL=info
BACKEND_INTERNAL_URL=http://backend:8000
MAX_CONCURRENT_SESSIONS=50
MAX_SESSIONS_PER_USER=5
ELEVENLABS_WS_URL=wss://api.elevenlabs.io/v1/convai/conversation
ELEVENLABS_BUFFER_LIMIT_BYTES=512000
WS_AUTH_TIMEOUT_MS=5000
AGENT_RUNTIME_FETCH_TIMEOUT_MS=5000
EVENT_EMISSION_TIMEOUT_MS=10000
HANDOFF_DECISION_TIMEOUT_MS=10000
```

1. Copy the block above, replace the `YOUR_...` placeholders with the same values from your `backend/.env.dev`
2. Go to GitHub > Your repo > Settings > Environments > `dev`
3. Under "Environment secrets", click "Add secret"
4. Name: `REALTIME_ENV`
5. Value: Paste the filled-in block
6. Click "Add secret"

> **Important:** The `JWT_SIGNING_KEY`, `INTERNAL_EVENT_SECRET`, `INTERNAL_NODE_API_KEY`, and `ELEVENLABS_API_KEY` must match the same values in your `BACKEND_ENV` secret.

### Step 8.6 -- Firebase Service Account JSON (`FIREBASE_SERVICE_ACCOUNT_JSON`)

The file `backend/firebase-service-account.json` contains credentials for sending push notifications. GitHub Actions writes this file to the server during deploy.

**How to get it (if you don't already have it):**
1. Go to https://console.firebase.google.com
2. Select your project (e.g., `mattbot-dev`)
3. Click the **gear icon** (top-left) > **Project settings**
4. Click the **"Service accounts"** tab
5. Click **"Generate new private key"**
6. A `.json` file will download

**How to add it as a GitHub Secret:**
1. Open the file `backend/firebase-service-account.json` (or the one you just downloaded)
2. Run in your terminal:

```bash
cat backend/firebase-service-account.json
```

3. **Copy the ENTIRE JSON output** (from `{` to `}`)
4. Go to GitHub > Your repo > Settings > Environments > `dev`
5. Under "Environment secrets", click "Add secret"
6. Name: `FIREBASE_SERVICE_ACCOUNT_JSON`
7. Value: Paste the entire JSON
8. Click "Add secret"

> **What happens during deploy:** GitHub Actions SSHes into the server, writes this JSON to `backend/firebase-service-account.json`, then Docker copies it into the container image. The backend references it via `FCM_SERVICE_ACCOUNT_JSON=/app/firebase-service-account.json`.

---

## PART 9: Test the Auto-Deploy

### Step 9.1 -- Push a change to main

On your local machine:

```bash
cd ~/mattbot   # or wherever your repo is cloned

# Make a tiny change (e.g., add a comment to .gitignore)
# Or just push existing changes

git add .
git commit -m "Add deployment infrastructure"
git push origin main
```

### Step 9.2 -- Watch the deployment

1. Go to your repo on GitHub
2. Click the **"Actions"** tab
3. You should see a workflow run called **"Deploy to Dev Server"**
4. Click on it to watch the progress
5. It should show green checkmarks for each step

If it fails:
- Click on the failed step to see the error
- Most common issues:
  - Wrong SSH key (check `EC2_SSH_KEY` in the `dev` environment secrets)
  - Wrong EC2 IP (check `EC2_HOST` in the `dev` environment secrets)
  - Security group doesn't allow SSH from GitHub (add 0.0.0.0/0 for port 22)

### Step 9.3 -- Verify on the server

```bash
# SSH into the server
ssh -i ~/.ssh/mattbot-dev-key.pem ubuntu@YOUR_EC2_IP

# Check containers
cd ~/mattbot
docker compose ps

# Check backend health
curl http://localhost:8000/health
```

---

## PART 10: Set Up SSL (HTTPS) -- Optional for Dev

> Skip this for now if you just want it working. Come back later.

### Step 10.1 -- Get a domain
You need a domain name (e.g., `dev.mattbot.app`). You can buy one from:
- Namecheap
- GoDaddy
- Route 53 (AWS)
- Google Domains

### Step 10.2 -- Point domain to EC2
Add an **A record**:
- Host: `dev` (or `@` for the root domain)
- Type: A
- Value: `YOUR_EC2_IP`
- TTL: 300

### Step 10.3 -- Get SSL certificate with Let's Encrypt
SSH into the server and run:

```bash
cd ~/mattbot

# Stop nginx temporarily
docker compose stop nginx

# Get certificate
docker run -it --rm \
  -v $(pwd)/nginx/certbot/conf:/etc/letsencrypt \
  -v $(pwd)/nginx/certbot/www:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  -d YOUR_DOMAIN.com \
  --email your@email.com \
  --agree-tos \
  --no-eff-email
```

### Step 10.4 -- Update nginx config
Edit `nginx/nginx.conf` on the server:
1. Uncomment the HTTPS server block
2. Replace `your-domain.com` with your actual domain
3. Uncomment the HTTP->HTTPS redirect
4. Restart nginx: `docker compose restart nginx`

---

## PART 11: Point Your Domain

### Step 11.1 -- Update DNS
In your DNS provider, add:

| Record Type | Host | Value |
|-------------|------|-------|
| A | dev (or @) | YOUR_EC2_IP |

### Step 11.2 -- Wait for DNS propagation
DNS can take 5-30 minutes to propagate. Test with:
```bash
nslookup dev.yourdomain.com
```

---

## PART 12: Verify Everything Works

### Check 1: Backend API
Open in browser: `http://YOUR_EC2_IP/health`
Expected: JSON response with status

### Check 2: API endpoints
```bash
# From your local machine or the server
curl http://YOUR_EC2_IP/api/v1/health
```

### Check 3: Container status
```bash
ssh -i ~/.ssh/mattbot-dev-key.pem ubuntu@YOUR_EC2_IP
cd ~/mattbot
docker compose ps
```
All should show "Up (healthy)"

### Check 4: Logs look clean
```bash
docker compose logs --tail=50 backend
docker compose logs --tail=50 realtime
docker compose logs --tail=50 nginx
```

### Check 5: Auto-deploy works
1. Make a small change on your local machine
2. Push to `main`
3. Check GitHub Actions tab -- should succeed
4. SSH into server -- should have the latest code

---

## TROUBLESHOOTING

### "Connection refused" when SSHing
- Check EC2 security group allows port 22
- Check you're using the right IP
- Check the `.pem` file is correct

### "Permission denied" when SSHing
```bash
# Fix .pem file permissions (must be read-only by owner)
chmod 600 ~/.ssh/mattbot-dev-key.pem
```

### Docker compose fails to build
```bash
# Check disk space
df -h

# Clean old Docker images
docker system prune -a -f

# Try building again
docker compose up -d --build
```

### Backend container keeps restarting
```bash
# Check the logs
docker compose logs backend

# Common issues:
# 1. Database connection failed -> Check DATABASE_URL in backend/.env
# 2. Missing .env file -> Make sure backend/.env exists
# 3. Alembic migration failed -> Check migration errors in logs
```

### "Connection refused" on port 8000
- Backend might still be starting. Wait 30 seconds and try again.
- Check: `docker compose logs backend`
- Check security group allows port 8000

### Redis connection issues
```bash
# Check Redis is running
docker compose ps redis
docker compose logs redis

# Redis should be accessible at localhost:6379 from inside Docker network
```

### GitHub Actions deploy fails
1. Check the **Actions** tab for the error message
2. Common issues:
   - **SSH connection failed**: Check `EC2_SSH_KEY`, `EC2_HOST`, `EC2_USER` in the environment secrets
   - **Permission denied on server**: Make sure `ubuntu` user has Docker access
   - **Docker build failed**: SSH into server and run `docker compose up -d --build` manually to see the full error

### "No space left on device"
```bash
# Clean Docker images and build cache
docker system prune -a -f
docker builder prune -a -f
```

### How to restart everything from scratch
```bash
cd ~/mattbot
docker compose down -v  # -v removes volumes (WARNING: deletes Redis data)
docker compose up -d --build
```

### How to check what's running
```bash
# All containers
docker ps -a

# Docker resource usage
docker stats

# Disk usage
docker system df
```

### How to update just one service
```bash
# Rebuild and restart just the backend
docker compose up -d --build backend

# Rebuild and restart just realtime
docker compose up -d --build realtime
```

---

## QUICK REFERENCE CARD

### SSH into server
```bash
ssh -i ~/.ssh/mattbot-dev-key.pem ubuntu@YOUR_EC2_IP
```

### View logs
```bash
docker compose logs -f          # All (live)
docker compose logs backend     # Backend only
docker compose logs realtime    # Realtime only
docker compose logs nginx       # Nginx only
```

### Restart services
```bash
docker compose restart          # Restart all
docker compose restart backend  # Restart one
```

### Rebuild & restart
```bash
docker compose up -d --build    # Rebuild all
```

### Stop everything
```bash
docker compose down             # Stop all
```

### Check health
```bash
curl http://localhost:8000/health   # Backend
curl http://localhost:3001/health   # Realtime
curl http://localhost/health        # Through Nginx
```

---

## WHAT HAPPENS ON EVERY DEPLOY

When you push to `main`, GitHub Actions automatically:

1. SSHes into your EC2 server
2. Creates/updates the `.env` files from GitHub Secrets
3. Pulls the latest code with `git pull`
4. Builds new Docker images
5. Restarts all containers
6. Runs Alembic migrations (inside the backend container startup)
7. Runs health checks to verify everything is working

The whole process takes about 2-5 minutes.

---

## COST ESTIMATE (Monthly)

| Resource | Cost |
|----------|------|
| EC2 t3.small | ~$15/month |
| Aiven PostgreSQL | Depends on plan |
| Domain name | ~$10/year |
| SSL Certificate (Let's Encrypt) | Free |
| GitHub Actions | Free (2000 min/month) |
| **Total** | **~$15-25/month** (excluding Aiven) |

---

## FILES CREATED FOR DEPLOYMENT

| File | Purpose |
|------|---------|
| `backend/Dockerfile` | Docker image for the Python FastAPI backend |
| `backend/.dockerignore` | Files to exclude from Docker build |
| `realtime/Dockerfile` | Docker image for the Node.js realtime bridge |
| `realtime/package.json` | Node.js dependencies for the bridge |
| `docker-compose.yml` | Orchestrates all services (backend, realtime, redis, nginx) |
| `nginx/nginx.conf` | Reverse proxy config (routes traffic to correct service) |
| `.github/workflows/deploy-dev.yml` | GitHub Actions auto-deploy workflow |
| `scripts/setup-server.sh` | One-time server setup script |
