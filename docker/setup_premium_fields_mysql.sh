#!/bin/bash
# Add Premium fields directly through a local MySQL database.
set -e

ENV_FILE="${ENV_FILE:-backend/.env}"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_DATABASE="${DB_DATABASE:-loans}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"

echo "==> Adding premium fields through MySQL: $DB_USER@$DB_HOST:$DB_PORT/$DB_DATABASE"

if [ -n "$DB_PASSWORD" ]; then
  mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "-p$DB_PASSWORD" "$DB_DATABASE" < "$(dirname "$0")/setup_premium_fields_mysql.sql"
else
  mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_DATABASE" < "$(dirname "$0")/setup_premium_fields_mysql.sql"
fi

echo ""
echo "✅ Premium MySQL fields are ready."
echo "   Restart Directus if Admin still does not show them."
