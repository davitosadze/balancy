#!/usr/bin/env python3
"""Set up Directus role, policy, permissions and public registration for LoansApp.
Directus 11 uses policies: Role -> Policy -> Permissions
"""
import urllib.request
import urllib.parse
import json
import sys

BASE = "http://localhost:8055"

def req(method, path, body=None, token=None):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        txt = e.read().decode()
        print(f"  HTTP {e.code} on {method} {path}: {txt[:300]}")
        return {}

# ── Login ──────────────────────────────────────────────────────────────────
print("==> Logging in...")
resp = req("POST", "/auth/login", {"email": "admin@loans.app", "password": "Admin123!"})
token = resp.get("data", {}).get("access_token")
if not token:
    print("ERROR: could not log in:", resp)
    sys.exit(1)
print("    OK")

# ── Find or create role ────────────────────────────────────────────────────
print("==> Finding Authenticated User role...")
resp = req("GET", "/roles?filter[name][_eq]=Authenticated+User", token=token)
roles = resp.get("data", [])
if roles:
    role_id = roles[0]["id"]
    print(f"    Found existing: {role_id}")
else:
    print("    Creating role...")
    resp = req("POST", "/roles", {
        "name": "Authenticated User",
        "description": "Regular mobile app users",
        "app_access": False,
        "admin_access": False,
    }, token=token)
    role_id = resp.get("data", {}).get("id")
    print(f"    Created: {role_id}")

# ── Find or create policy ──────────────────────────────────────────────────
print("==> Finding LoansApp User Policy...")
resp = req("GET", "/policies?filter[name][_eq]=LoansApp+User+Policy", token=token)
policies = resp.get("data", [])
if policies:
    policy_id = policies[0]["id"]
    print(f"    Found existing: {policy_id}")
else:
    print("    Creating policy...")
    resp = req("POST", "/policies", {
        "name": "LoansApp User Policy",
        "description": "Full CRUD on own records",
        "admin_access": False,
        "app_access": False,
        "ip_access": None,
    }, token=token)
    policy_id = resp.get("data", {}).get("id")
    print(f"    Created: {policy_id}")

# ── Attach policy to role ──────────────────────────────────────────────────
print("==> Attaching policy to role...")
req("POST", "/roles/" + role_id + "/policies", [{"policy": policy_id}], token=token)
# Try the junction table directly if above fails
resp2 = req("POST", "/access", {"role": role_id, "policy": policy_id}, token=token)
print("    OK")

# ── Permissions on the policy ──────────────────────────────────────────────
print("==> Setting permissions...")

CURRENT_USER = "$CURRENT_USER"

def perm(collection, action, permissions=None, fields=None):
    body = {
        "policy": policy_id,
        "collection": collection,
        "action": action,
        "permissions": permissions,
        "fields": fields or ["*"],
    }
    resp = req("POST", "/permissions", body, token=token)
    data = resp.get("data", {})
    pid = data.get("id", "err") if isinstance(data, dict) else "err"
    icon = "✓" if pid != "err" else "✗"
    print(f"  {icon} {collection}/{action}")

for coll in ["contacts", "loans", "repayments"]:
    perm(coll, "create", None)
    perm(coll, "read",   {"user_created": {"_eq": CURRENT_USER}})
    perm(coll, "update", {"user_created": {"_eq": CURRENT_USER}})
    perm(coll, "delete", {"user_created": {"_eq": CURRENT_USER}})

for action in ["read"]:
    perm("app_translations", action, None)

perm("directus_users", "read",
     {"id": {"_eq": CURRENT_USER}},
     [
         "id",
         "email",
         "first_name",
         "last_name",
         "avatar",
         "locale",
         "push_token",
         "premium_active",
         "premium_plan",
         "premium_until",
     ])
perm("directus_users", "update",
     {"id": {"_eq": CURRENT_USER}},
     [
         "first_name",
         "last_name",
         "avatar",
         "locale",
         "push_token",
         "password",
         "premium_active",
         "premium_plan",
         "premium_until",
     ])
perm("directus_users", "delete",
     {"id": {"_eq": CURRENT_USER}})

perm("directus_files", "create", None)
perm("directus_files", "read",   None)

# ── Public registration ────────────────────────────────────────────────────
print("==> Enabling public registration...")
req("PATCH", "/settings", {
    "public_registration": True,
    "public_registration_verify_email": False,
    "public_registration_role": role_id,
}, token=token)
print("    OK")

print()
print("✅  Done!")
print(f"   Admin UI:  {BASE}/admin")
print( "   Login:     admin@loans.app / Admin123!")
print(f"   Role ID:   {role_id}")
print(f"   Policy ID: {policy_id}")
