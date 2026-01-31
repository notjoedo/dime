from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

KNOT_CLIENT_ID = os.getenv("KNOT_CLIENT_ID")
KNOT_CLIENT_SECRET = os.getenv("KNOT_CLIENT_SECRET")
PHOTON_SERVER_URL = os.getenv("PHOTON_SERVER_URL", "http://localhost:4000")

saved_transactions = []

@app.route("/")
def index():
    return jsonify({"status": "working"})

@app.route("/api/knot/config", methods=["GET"])
def get_knot_config():
    """Expose Knot client ID to the frontend"""
    return jsonify({"client_id": KNOT_CLIENT_ID})

# --- Knot API Endpoints ---

@app.route("/api/knot/create-session", methods=["POST"])
def create_session():
    data = request.json
    userId = data.get("user_id")
    product = data.get("product", "transaction_link")
    card_id = data.get("card_id")  # Required for card_switcher
    
    url = "https://production.knotapi.com/session/create"
    payload = {
        "external_user_id": userId,
        "type": product
    }
    
    # card_id is required for card_switcher product
    if product == "card_switcher" and card_id:
        payload["card_id"] = card_id
    
    try:
        response = requests.post(
            url,
            json=payload,
            auth=(KNOT_CLIENT_ID, KNOT_CLIENT_SECRET),
            headers={"Content-Type": "application/json"}
        )
        return jsonify(response.json()), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/knot/transactions", methods=["POST"])
def sync_transactions():
    """Sync transactions from Knot API for a user and merchant"""
    data = request.json
    user_id = data.get("user_id")
    merchant_id = data.get("merchant_id")
    cursor = data.get("cursor")  # Optional: for pagination
    limit = data.get("limit", 50)  # Optional: default 50
    
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
    if not merchant_id:
        return jsonify({"error": "merchant_id is required"}), 400
    
    url = "https://production.knotapi.com/transactions/sync"
    payload = {
        "external_user_id": user_id,
        "merchant_id": int(merchant_id),
        "limit": limit
    }
    
    if cursor:
        payload["cursor"] = cursor
    
    try:
        response = requests.post(
            url,
            json=payload,
            auth=(KNOT_CLIENT_ID, KNOT_CLIENT_SECRET),
            headers={"Content-Type": "application/json"}
        )
        return jsonify(response.json()), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/knot/webhook", methods=["GET", "POST"])
def webhook():
    global saved_transactions
    if request.method == "POST":
        payload = request.json
        print(f"Knot Webhook Received: {payload.get('event_type')}")
        
        if payload.get("event_type") == "TRANSACTIONS_UPDATED":
            txs = payload.get("transactions", [])
            saved_transactions = txs + saved_transactions
            
            if txs:
                merchant = txs[0].get("merchant", {}).get("name", "New Merchant")
                amount = txs[0].get("price", {}).get("total", "0.00")
                message = f"Knot Alert: Transaction at {merchant} for ${amount}."
                
                try:
                    requests.post(f"{PHOTON_SERVER_URL}/message", json={"message": message}, timeout=1)
                except:
                    pass
                    
        return jsonify({"received": True})
    
    return jsonify({"transactions": saved_transactions})

if __name__ == "__main__":
    app.run(port=5001, debug=True)
