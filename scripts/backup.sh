#!/bin/sh
# Save the whole database to backups/crm-YYYYMMDD-HHMMSS.sql.gz and the attached files to
# backups/files-YYYYMMDD-HHMMSS.tar.gz (the stack must be running).
#   ./scripts/backup.sh
set -eu
# Git Bash on Windows would rewrite /app/... into a Windows path; keep container paths as they are
export MSYS_NO_PATHCONV=1
cd "$(dirname "$0")/.."
[ -f .env ] && . ./.env
mkdir -p backups
stamp="$(date +%Y%m%d-%H%M%S)"
file="backups/crm-$stamp.sql.gz"
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-crm}" -d "${POSTGRES_DB:-crm}" \
  --clean --if-exists --no-owner | gzip > "$file"
echo "Saved $file ($(wc -c < "$file") bytes)"
files="backups/files-$stamp.tar.gz"
docker compose exec -T backend tar -czf - -C /app/uploads . > "$files"
echo "Saved $files ($(wc -c < "$files") bytes)"
