#!/usr/bin/env python3
"""Test fetching repayments with a regular user token to check if the API works."""
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
        print(f"  HTTP {e.code}: {txt[:600]}")
        return {}

# Login as admin and check repayments exist
resp = req("POST", "/auth/login", {"email": "admin@loans.app", "password": "Admin123!"})
token = resp["data"]["access_token"]

# Check loans
loans = req("GET", "/items/loans?limit=5", token=token)
loan_list = loans.get("data", [])
print(f"Loans in DB: {len(loan_list)}")
for l in loan_list:
    print(f"  id={l.get('id')[:8]}... contact={l.get('contact_name')} amount={l.get('amount')}")

# Check repayments
repayments = req("GET", "/items/repayments?limit=20", token=token)
rep_list = repayments.get("data", [])
print(f"\nRepayments in DB: {len(rep_list)}")
for r in rep_list:
    print(f"  id={str(r.get('id'))[:8]}... loan_id={str(r.get('loan_id'))[:8]}... amount={r.get('amount')}")

# If there are loans and repayments, test the filter
if loan_list and rep_list:
    lid = loan_list[0]["id"]
    print(f"\nTesting filter for loan_id={lid[:8]}...")
    filtered = req("GET", f"/items/repayments?filter[loan_id][_eq]={lid}", token=token)
    print(f"Filtered result: {filtered}")
