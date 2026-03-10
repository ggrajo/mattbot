FROM python:3.13-slim

WORKDIR /app
ENV PYTHONPATH=/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY app/ ./app/
COPY alembic.ini ./
COPY alembic/ ./alembic/
COPY data/ ./data/

RUN pip install --no-cache-dir . 2>/dev/null || pip install --no-cache-dir -e .

# Firebase service account -- written to server by CI before docker build.
# If building locally without it, create an empty placeholder first:
#   echo "{}" > firebase-service-account.json
COPY firebase-service-account.json ./firebase-service-account.json

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["sh", "-c", "alembic upgrade head 2>&1 || echo 'WARN: alembic migration skipped (pyc-only migrations)'; uvicorn app.main:app --host 0.0.0.0 --port 8000"]
