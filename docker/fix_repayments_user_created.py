#!/usr/bin/env python3
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

# Patch user_created field type to uuid
print("Patching user_created field type to uuid...")
result = req("PATCH", "/fields/repayments/user_created", {
    "type": "uuid",
    "meta": {"hidden": True, "readonly": True, "special": ["user-created"]},
    "schema": {}
}, token=token)

data = result.get("data", {})
if data.get("type") == "uuid":
    print(f"OK: type is now {data['type']}")
else:
    print("Result:", result)

# Verify
print("\nVerifying fields:")
fields = req("GET", "/fields/repayments", token=token)
for f in fields.get("data", []):
    print(f"  {f['field']}: {f['type']} special={f.get('meta',{}).get('special')}")
