#!/bin/sh

set -u

INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"

while true; do
  if node /app/backup.mjs; then
    echo "$(date -Iseconds) 下次备份将在 ${INTERVAL} 秒后运行"
  else
    echo "$(date -Iseconds) 本次备份失败，将在 ${INTERVAL} 秒后重试"
  fi
  sleep "$INTERVAL"
done
