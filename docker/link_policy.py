#!/usr/bin/env python3
"""Link policy to role in Directus 11 via /access endpoint."""
import urllib.request, json, sys

BASE = "http://localhost:8055"
ROLE_ID = "6ee72f62-cdb7-439e-845f-0cc115046748"
POLICY_ID = "8699847f-40ca-4b4e-b77e-a0a123f28da4"

def req(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    h = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = "Bearer " + token
    r = urllib.request.Request(BASE + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {"err": e.read().decode()[:300]}

t = req("POST", "/auth/login", {"email": "admin@loans.app", "password": "Admin123!"})["data"]["access_token"]

# Check current access links for the role
r = req("GET", "/access?filter[role][_eq]=" + ROLE_ID, token=t)
links = r.get("data", [])
print("Existing access links for role:", links)

policy_linked = any(lnk.get("policy") == POLICY_ID for lnk in links)
if not policy_linked:
    r2 = req("POST", "/access", {"role": ROLE_ID, "policy": POLICY_ID, "sort": 1}, token=t)
    print("Link result:", r2)
else:
    print("Policy already linked to role - all good!")

# Also set default registration role on settings
r3 = req("PATCH", "/settings", {
    "public_registration": True,
    "public_registration_verify_email": False,
    "public_registration_role": ROLE_ID,
}, token=t)
print("Settings update:", "OK" if "data" in r3 else r3.get("err", "?")[:100])
