#!/bin/bash
# Backup PostgreSQL database before migration/deploy
# Usage: ./scripts/backup_db.sh [local|remote]
# local  — backup from local Docker container (rostics-db)
# remote — backup from production server via SSH

set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

MODE="${1:-local}"

if [ "$MODE" = "remote" ]; then
    echo "==> Backing up PRODUCTION database via SSH..."
    REMOTE_HOST="root@91.245.226.83"
    REMOTE_BACKUP="/tmp/rostics_backup_${TIMESTAMP}.sql.gz"

    ssh "$REMOTE_HOST" "docker exec rostics-db pg_dump -U rostics rostics | gzip > ${REMOTE_BACKUP}"
    scp "$REMOTE_HOST:${REMOTE_BACKUP}" "${BACKUP_DIR}/rostics_production_${TIMESTAMP}.sql.gz"
    ssh "$REMOTE_HOST" "rm -f ${REMOTE_BACKUP}"

    echo "==> Production backup saved to: ${BACKUP_DIR}/rostics_production_${TIMESTAMP}.sql.gz"
else
    echo "==> Backing up LOCAL database from Docker..."
    docker exec rostics-db pg_dump -U rostics rostics | gzip > "${BACKUP_DIR}/rostics_local_${TIMESTAMP}.sql.gz"

    echo "==> Local backup saved to: ${BACKUP_DIR}/rostics_local_${TIMESTAMP}.sql.gz"
fi

echo "==> Backup size: $(du -h "${BACKUP_DIR}/rostics_${MODE}_${TIMESTAMP}.sql.gz" 2>/dev/null | cut -f1 || echo 'check manually')"
echo "==> Done!"
