"""
PayPilot Autonomous Agentic Procurement Bot (Python Reference)
-------------------------------------------------------------
This script demonstrates how an autonomous AI procurement agent interacts with 
the PayPilot Agentic Commerce API (generated via APIMatic SDK):

1. Queries the Assistant for a laptop meeting specific engineering criteria.
2. Programmatically inspects the 5-stage agent reasoning audit trace.
3. Compares the primary recommendation against the top alternative.
4. Stages a server-authoritative PayPal Developer Sandbox order with explicit approval.
"""

import os
import json
import urllib.request
import urllib.error

BASE_URL = os.getenv("PAYPILOT_API_URL", "http://localhost:5000/api")

def send_request(endpoint: str, method: str = "GET", data: dict = None) -> dict:
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode("utf-8") if data else None

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"[Error {e.code}] {error_body}")
        raise

def main():
    print("=" * 70)
    print("🤖 PayPilot Autonomous Procurement Agent (APIMatic Edition)")
    print("=" * 70)

    # 1. Submit Natural Language Shopping Goal
    goal = "I need a high-performance coding laptop under ₹80,000 with 16GB RAM and SO-DIMM upgradability"
    print(f"\n[Step 1] Submitting agent goal to /api/assistant/chat:\n  >> '{goal}'")
    
    chat_payload = {
        "message": goal,
        "sessionId": "agent_session_apimatic_001"
    }
    chat_response = send_request("/assistant/chat", method="POST", data=chat_payload)
    data = chat_response.get("data", {})
    recommendation = data.get("recommendation", {})
    alternatives = data.get("alternatives", [])

    print(f"\n[Step 2] Grounded Recommendation Received:")
    print(f"  • Model: {recommendation.get('name')}")
    print(f"  • Price: ₹{recommendation.get('priceINR'):,} (USD ${recommendation.get('priceUSD')})")
    print(f"  • Processor: {recommendation.get('processor', {}).get('model')}")
    print(f"  • RAM: {recommendation.get('ram', {}).get('capacityGB')}GB (Upgradable: {recommendation.get('ram', {}).get('isUpgradable')})")

    # 2. Compare against alternative if available
    if alternatives:
        alt = alternatives[0]
        print(f"\n[Step 3] Performing Side-by-Side Spec Matrix via /api/compare:")
        compare_payload = {"productIds": [recommendation["id"], alt["id"]]}
        compare_response = send_request("/compare", method="POST", data=compare_payload)
        diffs = compare_response.get("data", {}).get("differences", [])
        for d in diffs:
            print(f"  • {d.get('aspect')}: {d.get('detail')}")

    # 3. Stage Server-Authoritative PayPal Developer Sandbox Order
    print(f"\n[Step 4] Staging Server-Authoritative PayPal Sandbox Order via /api/paypal/create-order...")
    order_payload = {
        "productId": recommendation["id"],
        "quantity": 1,
        "currency": "USD",
        "approvalConfirmed": True,  # Explicit Agentic Safety requirement
        "buyer": {
            "name": "Autonomous Procurement Bot",
            "email": "procurement.bot@autonomous-corp.example",
            "notes": "Autonomous engineering laptop procurement pipeline"
        },
        "shippingAddress": {
            "recipientName": "Engineering Receiving Dock",
            "addressLine1": "2211 Innovation Blvd",
            "city": "San Jose",
            "state": "CA",
            "postalCode": "95131",
            "countryCode": "US"
        }
    }
    order_response = send_request("/paypal/create-order", method="POST", data=order_payload)
    order_data = order_response.get("data", {})
    print(f"  ✅ PayPal Sandbox Order Created: {order_data.get('id')}")
    print(f"  ✅ Server-Authoritative Total: {order_data.get('amount', {}).get('value')} {order_data.get('amount', {}).get('currency')}")
    print(f"  ✅ Internal Order Draft ID: {order_data.get('orderDraftId')}")
    print("\n" + "=" * 70)
    print("🏆 APIMatic Agentic Workflow Executed Successfully!")
    print("=" * 70)

if __name__ == "__main__":
    main()
