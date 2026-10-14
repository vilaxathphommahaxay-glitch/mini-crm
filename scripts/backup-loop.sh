#!/bin/sh
# Runs inside the `backup` service (docker-compose.yml): one backup right away, then one every
# BACKUP_INTERVAL_SECONDS (default: daily). Files older than BACKUP_KEEP_DAYS are removed.
# The files are the same format as scripts/backup.sh, so scripts/restore.sh restores them.
set -eu

interval="${BACKUP_INTERVAL_SECONDS:-86400}"
keep_days="${BACKUP_KEEP_DAYS:-14}"

until pg_isready -q; do sleep 2; done

while true; do
  file="/backups/crm-$(date +%Y%m%d-%H%M%S).sql.gz"
  if pg_dump --clean --if-exists --no-owner | gzip > "$file.tmp"; then
    mv "$file.tmp" "$file"
    echo "backup: saved $file ($(wc -c < "$file") bytes)"
  else
    rm -f "$file.tmp"
    echo "backup: FAILED at $(date)" >&2
  fi
  # keep the last BACKUP_KEEP_DAYS days
  find /backups -name 'crm-*.sql.gz' -mtime "+$keep_days" -print -delete | sed 's/^/backup: removed old /'
  sleep "$interval"
done
