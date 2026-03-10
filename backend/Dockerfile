FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
RUN pip install --no-cache-dir -e ".[dev]" 2>/dev/null || pip install --no-cache-dir .

COPY alembic.ini ./
COPY alembic/ ./alembic/
COPY app/ ./app/
COPY data/ ./data/

# Firebase service account -- written to server by CI before docker build.
# If building locally without it, create an empty placeholder first:
#   echo "{}" > firebase-service-account.json
COPY firebase-service-account.json ./firebase-service-account.json

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
