#!/bin/sh
set -eu

# Nightly same-box backup job (T12).
#
# Default mode: sleep until BACKUP_TIME (UTC) every day, then dump Postgres
# and mirror the MinIO bucket into /backups/<stamp>/, pruning older runs.
# `backup run` performs a single run immediately and exits (for manual or
# CI verification).
#
# Prints a timestamped line per run to stdout so Coolify logs the last
# successful backup.

BACKUP_TIME="${BACKUP_TIME:-02:00}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:?POSTGRES_USER is required}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}"
POSTGRES_DB="${POSTGRES_DB:-receipts}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-minio:9000}"
MINIO_ROOT_USER="${MINIO_ROOT_USER:?MINIO_ROOT_USER is required}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD is required}"
MINIO_BUCKET="${MINIO_BUCKET:-receipts}"

case "$MINIO_ENDPOINT" in
  http://* | https://*) MINIO_URL="$MINIO_ENDPOINT" ;;
  *) MINIO_URL="http://$MINIO_ENDPOINT" ;;
esac

now_utc() {
  date -u +%Y-%m-%dT%H:%M:%SZ
}

prune() {
  dir="$1"
  [ -d "$dir" ] || return 0
  find "$dir" -mindepth 1 -maxdepth 1 -type d \
    -mtime +"$BACKUP_RETENTION_DAYS" -exec rm -rf {} +
}

# Always enforce retention, even when a run fails mid-way (e.g. pg_dump dies
# and `set -eu` aborts before the explicit prune).
trap 'prune "$BACKUP_DIR/postgres"; prune "$BACKUP_DIR/minio"' EXIT

run_backup() {
  stamp="$(now_utc)"
  postgres_dir="$BACKUP_DIR/postgres/$stamp"
  minio_dir="$BACKUP_DIR/minio/$stamp"
  mkdir -p "$postgres_dir" "$minio_dir"

  echo "[$(now_utc)] dumping postgres database '$POSTGRES_DB'"
  PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
    --host="$POSTGRES_HOST" --port="$POSTGRES_PORT" \
    --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" \
    --format=custom --file="$postgres_dir/dump.dump"

  echo "[$(now_utc)] mirroring minio bucket '$MINIO_BUCKET'"
  mc alias set backup "$MINIO_URL" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null
  mc mirror --quiet --overwrite "backup/$MINIO_BUCKET" "$minio_dir"

  echo "[$(now_utc)] backup complete (retention ${BACKUP_RETENTION_DAYS}d)"
}

seconds_until_next_run() {
  hour="${BACKUP_TIME%%:*}"
  minute="${BACKUP_TIME##*:}"
  target=$((hour * 60 + minute))
  now=$(( $(date -u +%H) * 60 + $(date -u +%M) ))
  if [ "$now" -lt "$target" ]; then
    echo $(( (target - now) * 60 ))
  else
    echo $(( (1440 - now + target) * 60 ))
  fi
}

schedule() {
  echo "[$(now_utc)] backup scheduler started; running daily at ${BACKUP_TIME} UTC"
  while true; do
    wait_seconds="$(seconds_until_next_run)"
    next_epoch=$(( $(date -u +%s) + wait_seconds ))
    echo "[$(now_utc)] next backup in ${wait_seconds}s ($(date -u -d "@$next_epoch" +%Y-%m-%dT%H:%M:%SZ))"
    sleep "$wait_seconds"
    run_backup
  done
}

case "${1:-}" in
  run) run_backup ;;
  *) schedule ;;
esac
