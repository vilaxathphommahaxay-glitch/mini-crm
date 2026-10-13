#!/bin/sh
# Bring the database schema up to date, add demo data once, then start the server.
set -e

echo "Running database migrations..."
alembic upgrade head

if [ "${SEED_DEMO_DATA:-true}" = "true" ]; then
  # Only seeds an empty database, so restarts keep your data.
  python -m app.seed
fi

exec "$@"
