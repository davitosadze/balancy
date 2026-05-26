#!/bin/bash
# Add Premium fields directly through the local Postgres container.
set -e

CONTAINER="${DB_CONTAINER:-loans_postgres}"
DB_USER="${DB_USER:-directus}"
DB_DATABASE="${DB_DATABASE:-loans}"

echo "==> Adding premium fields through Postgres container: $CONTAINER"
docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_DATABASE" < "$(dirname "$0")/setup_premium_fields.sql"
echo ""
echo "✅ Premium DB fields are ready."
echo "   Restart Directus if Admin still does not show them."
