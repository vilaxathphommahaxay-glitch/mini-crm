#!/bin/sh
# Save the whole database to backups/crm-YYYYMMDD-HHMMSS.sql.gz (the stack must be running).
#   ./scripts/backup.sh
set -eu
cd "$(dirname "$0")/.."
[ -f .env ] && . ./.env
mkdir -p backups
file="backups/crm-$(date +%Y%m%d-%H%M%S).sql.gz"
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-crm}" -d "${POSTGRES_DB:-crm}" \
  --clean --if-exists --no-owner | gzip > "$file"
echo "Saved $file ($(wc -c < "$file") bytes)"
