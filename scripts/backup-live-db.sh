#!/usr/bin/env bash
# Run this on the live server in Termius BEFORE git pull / migrate.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="${BACKUP_DIR:-/var/backups/etude-panel}"
mkdir -p "$OUT_DIR"

ENV_FILE="$ROOT/backend/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "backend/.env not found at $ENV_FILE" >&2
  exit 1
fi

DATABASE_URL="$(awk -F= '/^DATABASE_URL=/{print substr($0, index($0,"=")+1)}' "$ENV_FILE" | tr -d '"' | tr -d "'")"
if [[ -z "$DATABASE_URL" ]]; then
  echo "DATABASE_URL missing in backend/.env" >&2
  exit 1
fi

DUMP="$OUT_DIR/etude-panel-$STAMP.sql"
echo "Backing up to $DUMP"

if command -v pg_dump >/dev/null 2>&1; then
  pg_dump --no-owner --no-acl "$DATABASE_URL" > "$DUMP"
elif docker ps --format '{{.Names}}' | grep -q postgres; then
  CONTAINER="$(docker ps --format '{{.Names}}' | grep postgres | head -1)"
  docker exec "$CONTAINER" pg_dump -U etude etude_panel > "$DUMP"
else
  echo "pg_dump not found and no postgres container running." >&2
  exit 1
fi

gzip -f "$DUMP"
echo "OK: ${DUMP}.gz"
ls -lh "${DUMP}.gz"
