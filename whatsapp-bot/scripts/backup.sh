#!/bin/sh
# Daily database backup; keeps 14 days. Add to the server's crontab:
#   15 2 * * * /opt/bookbot/whatsapp-bot/scripts/backup.sh >> /var/log/bookbot-backup.log 2>&1
set -e
cd "$(dirname "$0")/../deploy"
docker compose exec -T bookbot node --disable-warning=ExperimentalWarning src/manage.js backup
find ../data/backups -name 'bookbot-*.db' -mtime +14 -delete
echo "$(date -Is) backup done"
