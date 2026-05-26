#!/usr/bin/env python3
"""Fix repayments permissions: replace user_created filter with null (no row filter).
Repayments are already scoped by loan_id in app queries, and loans have user_created security.
"""
import urllib.request
import json

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
        print(f"  HTTP {e.code}: {txt[:500]}")
        return {}

resp = req("POST", "/auth/login", {"email": "admin@loans.app", "password": "Admin123!"})
token = resp["data"]["access_token"]

# Get all permissions for repayments
print("Fetching repayments permissions...")
perms = req("GET", "/permissions?filter[collection][_eq]=repayments&limit=50", token=token)
rows = perms.get("data", [])
print(f"Found {len(rows)} permission entries")

# Find the LoansApp User Policy ID
policies = req("GET", "/policies?filter[name][_eq]=LoansApp+User+Policy", token=token)
policy_id = (policies.get("data") or [{}])[0].get("id")
print(f"Policy ID: {policy_id}")

# Remove the user_created filter from read/update/delete on repayments
# by patching permissions to have null filter
for p in rows:
    pid = p["id"]
    action = p["action"]
    pfilter = p.get("permissions")
    if pfilter and "user_created" in (pfilter or {}):
        print(f"  Patching permission {pid} ({action}): removing user_created filter")
        result = req("PATCH", f"/permissions/{pid}", {
            "permissions": None
        }, token=token)
        if result.get("data"):
            print(f"    OK: filter is now {result['data'].get('permissions')}")
        else:
            print(f"    Result: {result}")

print("\nDone. Repayments permissions updated.")

# Verify
perms2 = req("GET", "/permissions?filter[collection][_eq]=repayments&limit=50", token=token)
for p in perms2.get("data", []):
    print(f"  {p['action']}: {p.get('permissions')}")
