#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
export MYSQL_PWD="${MYSQL_ROOT_PASSWORD:?}"

backup() {
  local stamp
  stamp="$(date -u +%Y%m%dT%H%M%SZ)-$$"
  # Files are immutable and written before DB references. Copy after the DB
  # snapshot so the archive contains every image referenced by that snapshot.
  mysqldump -h mysql -u root --single-transaction --routines --triggers --events \
    --no-tablespaces --set-gtid-purged=OFF "${MYSQL_DATABASE:?}" \
    | gzip > "/backups/ethica-db-${stamp}.sql.gz.partial"
  tar -C /media -czf "/backups/ethica-media-${stamp}.tar.gz.partial" .
  mv "/backups/ethica-media-${stamp}.tar.gz.partial" "/backups/ethica-media-${stamp}.tar.gz"
  mv "/backups/ethica-db-${stamp}.sql.gz.partial" "/backups/ethica-db-${stamp}.sql.gz"
  printf 'Backup complete: %s\n' "$stamp"
}

if [[ "${1:-}" == once ]]; then
  backup
  exit 0
fi
trap 'exit 0' TERM INT
while :; do
  backup
  sleep 86400 &
  wait $!
done
