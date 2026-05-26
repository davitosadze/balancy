#!/bin/bash
# Apply LoansApp schema to a running Directus instance
set -e

BASE="http://localhost:8055"

echo "==> Logging in..."
LOGIN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@loans.app","password":"Admin123!"}')

TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['access_token'])")
echo "    Token acquired."

AUTH="-H \"Authorization: Bearer $TOKEN\""

call() {
  curl -s -X "$1" "$BASE$2" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$3"
}

# ── Helper: create collection ──────────────────────────────────────────────
create_collection() {
  local name=$1
  local meta=$2
  echo "  Creating collection: $name"
  call POST "/collections" "{
    \"collection\": \"$name\",
    \"meta\": $meta,
    \"schema\": {}
  }" > /dev/null
}

# ── Helper: create field ───────────────────────────────────────────────────
create_field() {
  local coll=$1
  local body=$2
  call POST "/fields/$coll" "$body" > /dev/null
}

echo ""
echo "==> Creating collections..."

# ── contacts ──────────────────────────────────────────────────────────────
create_collection "contacts" '{"icon":"contacts","display_template":"{{name}}"}'

create_field "contacts" '{"field":"id","type":"uuid","meta":{"hidden":true,"readonly":true},"schema":{"is_primary_key":true,"has_auto_increment":false}}'
create_field "contacts" '{"field":"user_created","type":"uuid","meta":{"hidden":true,"readonly":true,"special":["user-created"]},"schema":{}}'
create_field "contacts" '{"field":"date_created","type":"timestamp","meta":{"hidden":true,"readonly":true,"special":["date-created"]},"schema":{}}'
create_field "contacts" '{"field":"name","type":"string","meta":{"required":true},"schema":{"is_nullable":false}}'
create_field "contacts" '{"field":"phone","type":"string","meta":{},"schema":{"is_nullable":true}}'

# ── loans ──────────────────────────────────────────────────────────────────
create_collection "loans" '{"icon":"account-cash","display_template":"{{contact_name}} – {{amount}} {{currency}}"}'

create_field "loans" '{"field":"id","type":"uuid","meta":{"hidden":true,"readonly":true},"schema":{"is_primary_key":true,"has_auto_increment":false}}'
create_field "loans" '{"field":"user_created","type":"uuid","meta":{"hidden":true,"readonly":true,"special":["user-created"]},"schema":{}}'
create_field "loans" '{"field":"date_created","type":"timestamp","meta":{"hidden":true,"readonly":true,"special":["date-created"]},"schema":{}}'
create_field "loans" '{"field":"date_updated","type":"timestamp","meta":{"hidden":true,"readonly":true,"special":["date-updated"]},"schema":{}}'
create_field "loans" '{"field":"type","type":"string","meta":{"required":true,"interface":"select-dropdown","options":{"choices":[{"text":"Lent","value":"lent"},{"text":"Borrowed","value":"borrowed"}]}},"schema":{"is_nullable":false}}'
create_field "loans" '{"field":"contact_name","type":"string","meta":{"required":true},"schema":{"is_nullable":false}}'
create_field "loans" '{"field":"contact_id","type":"uuid","meta":{},"schema":{"is_nullable":true}}'
create_field "loans" '{"field":"phone","type":"string","meta":{},"schema":{"is_nullable":true}}'
create_field "loans" '{"field":"amount","type":"decimal","meta":{"required":true},"schema":{"is_nullable":false,"numeric_precision":15,"numeric_scale":2}}'
create_field "loans" '{"field":"currency","type":"string","meta":{"required":true},"schema":{"is_nullable":false,"default_value":"USD"}}'
create_field "loans" '{"field":"loan_date","type":"date","meta":{"required":true},"schema":{"is_nullable":false}}'
create_field "loans" '{"field":"due_date","type":"date","meta":{},"schema":{"is_nullable":true}}'
create_field "loans" '{"field":"notes","type":"text","meta":{},"schema":{"is_nullable":true}}'
create_field "loans" '{"field":"status","type":"string","meta":{"interface":"select-dropdown","options":{"choices":[{"text":"Active","value":"active"},{"text":"Partially Paid","value":"partially_paid"},{"text":"Paid","value":"paid"}]},"default_value":"active"},"schema":{"is_nullable":false,"default_value":"active"}}'

# ── repayments ─────────────────────────────────────────────────────────────
create_collection "repayments" '{"icon":"cash-multiple","display_template":"{{amount}} on {{date}}"}'

create_field "repayments" '{"field":"id","type":"uuid","meta":{"hidden":true,"readonly":true},"schema":{"is_primary_key":true,"has_auto_increment":false}}'
create_field "repayments" '{"field":"date_created","type":"timestamp","meta":{"hidden":true,"readonly":true,"special":["date-created"]},"schema":{}}'
create_field "repayments" '{"field":"loan_id","type":"uuid","meta":{"required":true},"schema":{"is_nullable":false}}'
create_field "repayments" '{"field":"amount","type":"decimal","meta":{"required":true},"schema":{"is_nullable":false,"numeric_precision":15,"numeric_scale":2}}'
create_field "repayments" '{"field":"date","type":"date","meta":{"required":true},"schema":{"is_nullable":false}}'
create_field "repayments" '{"field":"notes","type":"text","meta":{},"schema":{"is_nullable":true}}'

# ── app_translations ───────────────────────────────────────────────────────
create_collection "app_translations" '{"icon":"translate","display_template":"{{language_code}}: {{key}}"}'

create_field "app_translations" '{"field":"id","type":"integer","meta":{"hidden":true,"readonly":true},"schema":{"is_primary_key":true,"has_auto_increment":true}}'
create_field "app_translations" '{"field":"language_code","type":"string","meta":{"required":true},"schema":{"is_nullable":false}}'
create_field "app_translations" '{"field":"key","type":"string","meta":{"required":true},"schema":{"is_nullable":false}}'
create_field "app_translations" '{"field":"value","type":"text","meta":{"required":true},"schema":{"is_nullable":false}}'

# ── directus_users premium fields ─────────────────────────────────────────
# These are custom fields on the system users table. They must exist in the DB
# for the Admin UI and /premium-status/me extension to persist premium status.
echo ""
echo "==> Creating premium fields on directus_users..."
create_field "directus_users" '{"field":"premium_active","type":"boolean","meta":{"interface":"boolean","width":"half","note":"Whether Premium features are active for this user."},"schema":{"is_nullable":false,"default_value":false}}'
create_field "directus_users" '{"field":"premium_plan","type":"string","meta":{"interface":"input","width":"half","note":"Premium billing plan, for example monthly."},"schema":{"is_nullable":true}}'
create_field "directus_users" '{"field":"premium_until","type":"dateTime","meta":{"interface":"datetime","width":"half","note":"Optional Premium expiration date/time."},"schema":{"is_nullable":true}}'

echo ""
echo "==> Setting public registration policy..."
call PATCH "/settings" '{"public_registration":true,"public_registration_verify_email":false}' > /dev/null

echo ""
echo "✅  Schema setup complete!"
echo "    Admin UI:  $BASE/admin"
echo "    Login:     admin@loans.app / Admin123!"
