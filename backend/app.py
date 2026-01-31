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

# --- Knot API Endpoints ---

@app.route("/api/knot/create-session", methods=["POST"])
def create_session():
    data = request.json
    userId = data.get("user_id")
    product = data.get("product", "link")
    
    url = "https://production.knotapi.com/session/create"
    payload = {
        "external_user_id": userId,
        "type": product
    }
    
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
    app.run(port=5000, debug=True)
