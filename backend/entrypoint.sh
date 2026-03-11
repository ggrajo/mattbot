#!/bin/bash
set -e

echo "Running database migrations..."
alembic upgrade head || echo "WARNING: Alembic migrations failed (non-fatal)"

exec "$@"
