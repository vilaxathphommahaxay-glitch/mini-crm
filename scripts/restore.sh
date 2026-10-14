#!/bin/sh
# Replace the database with a backup made by backup.sh. Everything currently stored is lost.
#   ./scripts/restore.sh backups/crm-20261014-120000.sql.gz
set -eu
cd "$(dirname "$0")/.."
[ -f .env ] && . ./.env
file="${1:?usage: scripts/restore.sh <backup.sql.gz>}"
[ -f "$file" ] || { echo "No such file: $file" >&2; exit 1; }
printf 'This replaces ALL current data with %s. Type "restore" to continue: ' "$file"
read -r answer
[ "$answer" = "restore" ] || { echo "Cancelled."; exit 1; }
gunzip -c "$file" | docker compose exec -T db psql -q -v ON_ERROR_STOP=1 \
  -U "${POSTGRES_USER:-crm}" -d "${POSTGRES_DB:-crm}" > /dev/null
echo "Restored $file"
