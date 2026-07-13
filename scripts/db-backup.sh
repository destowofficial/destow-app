#!/usr/bin/env bash
# Postgres backup for Destow -> a timestamped custom-format dump (restore with
# pg_restore). Portable across dev and prod:
#
#   Dev (docker stack):  make backup            (uses the db container)
#   Prod / cron:         DATABASE_URL=postgres://... scripts/db-backup.sh [outdir]
#                        then ship the file to S3/MinIO.
#
# Managed RDS automated snapshots are the recommended prod baseline; this script
# is a portable supplement / for self-hosted Postgres.
set -euo pipefail

OUT_DIR="${1:-backups}"
mkdir -p "$OUT_DIR"
FILE="$OUT_DIR/destow-$(date +%Y%m%d-%H%M%S).dump"

if [ -n "${DATABASE_URL:-}" ]; then
  # Direct connection (needs pg_dump on PATH) — used in prod/cron.
  pg_dump "$DATABASE_URL" -Fc -f "$FILE"
else
  # Fall back to the local docker stack's db container.
  ( cd "$(dirname "$0")/../apps/api" && docker compose exec -T db pg_dump -U destow -d destow -Fc ) > "$FILE"
fi

echo "backup written: $FILE ($(du -h "$FILE" | cut -f1))"

# Retention: keep the newest 14 dumps in this directory.
ls -1t "$OUT_DIR"/destow-*.dump 2>/dev/null | tail -n +15 | xargs -r rm -f
