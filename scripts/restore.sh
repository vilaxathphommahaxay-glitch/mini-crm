#!/bin/sh
# Replace the database (and, if given, the attached files) with a backup made by backup.sh or
# the backup service. Everything currently stored is lost.
#   ./scripts/restore.sh backups/crm-20261014-120000.sql.gz
#   ./scripts/restore.sh backups/crm-20261014-120000.sql.gz backups/files-20261014-120000.tar.gz
set -eu
# Git Bash on Windows would rewrite /app/... into a Windows path; keep container paths as they are
export MSYS_NO_PATHCONV=1
cd "$(dirname "$0")/.."
[ -f .env ] && . ./.env
file="${1:?usage: scripts/restore.sh <backup.sql.gz> [files.tar.gz]}"
files="${2:-}"
[ -f "$file" ] || { echo "No such file: $file" >&2; exit 1; }
[ -z "$files" ] || [ -f "$files" ] || { echo "No such file: $files" >&2; exit 1; }
printf 'This replaces ALL current data with %s. Type "restore" to continue: ' "$file"
read -r answer
[ "$answer" = "restore" ] || { echo "Cancelled."; exit 1; }
gunzip -c "$file" | docker compose exec -T db psql -q -v ON_ERROR_STOP=1 \
  -U "${POSTGRES_USER:-crm}" -d "${POSTGRES_DB:-crm}" > /dev/null
echo "Restored $file"
if [ -n "$files" ]; then
  docker compose exec -T backend sh -c 'find /app/uploads -mindepth 1 -delete && tar -xzf - -C /app/uploads' < "$files"
  echo "Restored $files"
fi
