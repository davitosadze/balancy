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
        print(f"  HTTP {e.code} on {method} {path}: {txt[:400]}")
        return {}

resp = req("POST", "/auth/login", {"email": "admin@loans.app", "password": "Admin123!"})
token = resp.get("data", {}).get("access_token")
print(f"Token: {token[:20] if token else 'FAILED'}...")

result = req("POST", "/fields/repayments", {
    "field": "user_created",
    "type": "uuid",
    "meta": {"hidden": True, "readonly": True, "special": ["user-created"]},
    "schema": {}
}, token=token)

if result.get("data", {}).get("field") == "user_created":
    print("OK: user_created field added to repayments")
else:
    print("Result:", result)
