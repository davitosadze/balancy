#!/bin/bash
# Add Premium custom fields to Directus users.
# Run this against an existing local Directus instance when the fields are
# missing from Admin > User Directory or the directus_users database table.
set -e

BASE="${DIRECTUS_URL:-http://localhost:8055}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@loans.app}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin123!}"

echo "==> Logging in to $BASE..."
LOGIN=$(curl -s -f -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}") || {
  echo "✗ Could not connect/login to Directus."
  echo "  Make sure Directus is running at $BASE and admin credentials are correct."
  exit 1
}

TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['access_token'])")
echo "    Token acquired."

create_field() {
  local field=$1
  local body=$2
  local status
  status=$(curl -s -o /tmp/directus-field-response.json -w "%{http_code}" \
    -X GET "$BASE/fields/directus_users/$field" \
    -H "Authorization: Bearer $TOKEN")

  if [ "$status" = "200" ]; then
    echo "  • $field already exists"
    return
  fi

  status=$(curl -s -o /tmp/directus-field-response.json -w "%{http_code}" \
    -X POST "$BASE/fields/directus_users" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$body")

  if [ "$status" = "200" ] || [ "$status" = "201" ]; then
    echo "  ✓ Created $field"
  elif grep -qi "already" /tmp/directus-field-response.json; then
    echo "  • $field already exists"
  else
    echo "  ✗ Failed to create $field"
    cat /tmp/directus-field-response.json
    exit 1
  fi
}

echo "==> Creating premium fields on directus_users..."
create_field "premium_active" '{"field":"premium_active","type":"boolean","meta":{"interface":"boolean","width":"half","note":"Whether Premium features are active for this user."},"schema":{"is_nullable":false,"default_value":false}}'
create_field "premium_plan" '{"field":"premium_plan","type":"string","meta":{"interface":"input","width":"half","note":"Premium billing plan, for example monthly."},"schema":{"is_nullable":true}}'
create_field "premium_until" '{"field":"premium_until","type":"dateTime","meta":{"interface":"datetime","width":"half","note":"Optional Premium expiration date/time."},"schema":{"is_nullable":true}}'

echo ""
echo "✅ Premium fields are ready."
echo "   Check Directus Admin > Settings > Data Model > User Directory."
