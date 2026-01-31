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
    cursor = data.get("cursor") 
    limit = data.get("limit", 50)
    
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


# --- Stub Endpoints ---

@app.route("/api/top-of-file", methods=["GET"])
def get_top_of_file():
    """Get top of file data - placeholder"""
    pass


@app.route("/api/cashflow", methods=["GET"])
def get_cashflow():
    """Get cashflow data - placeholder"""
    pass


@app.route("/api/alerts", methods=["GET"])
def get_alerts():
    """Get alerts - placeholder"""
    pass


@app.route("/api/optimal-card", methods=["POST"])
def get_optimal_card():
    """
    Get the optimal card for a given merchant
    
    Request body:
    {
        "merchant": "Amazon" or merchant_id,
        "category": "optional category like 'groceries', 'travel', etc."
    }
    
    Returns the best card from saved_cards for this merchant
    """
    data = request.json or {}
    merchant = data.get("merchant", "")
    category = data.get("category", "")
    
    # Placeholder logic - in production this would:
    # 1. Look up card rewards/benefits
    # 2. Match against merchant category
    # 3. Return the card with best rewards
    
    if not saved_cards:
        return jsonify({
            "error": "No cards saved",
            "recommendation": None
        }), 404
    
    # For now, just return the first card as a placeholder
    best_card = saved_cards[0]
    
    # Mask sensitive data
    response = {
        "merchant": merchant,
        "category": category,
        "recommendation": {
            "card_id": best_card.get("card_id"),
            "card_number": f"****{best_card.get('card', {}).get('number', '')[-4:]}",
            "cardholder": f"{best_card.get('user', {}).get('name', {}).get('first_name', '')} {best_card.get('user', {}).get('name', {}).get('last_name', '')}",
            "reason": "Placeholder - implement reward matching logic"
        }
    }
    
    return jsonify(response)


# --- Card Management ---

# In-memory card storage (replace with database in production)
saved_cards = []

@app.route("/api/cards", methods=["GET", "POST"])
def manage_cards():
    """
    GET: List all saved cards
    POST: Add a new card with billing address
    
    Card schema matches Knot API JWE payload structure:
    {
        "user": {
            "name": {
                "first_name": "Ada",
                "last_name": "Lovelace"
            },
            "address": {
                "street": "100 Main Street",
                "street2": "#100",
                "city": "NEW YORK",
                "region": "NY",
                "postal_code": "12345",
                "country": "US"
            },
            "phone_number": "+11234567890"
        },
        "card": {
            "number": "4242424242424242",
            "expiration": "08/2030",
            "cvv": "012"
        },
        "card_id": "optional_external_id"
    }
    """
    global saved_cards
    
    if request.method == "GET":
        # Return cards with masked numbers for security
        masked_cards = []
        for card in saved_cards:
            masked = card.copy()
            if "card" in masked and "number" in masked["card"]:
                num = masked["card"]["number"]
                masked["card"]["number"] = f"****{num[-4:]}" if len(num) >= 4 else "****"
            if "card" in masked:
                masked["card"].pop("cvv", None)
            masked_cards.append(masked)
        return jsonify({"cards": masked_cards})
    
    # POST - Add new card
    data = request.json
    if not data:
        return jsonify({"error": "Request body is required"}), 400
    
    # Validate required fields
    user = data.get("user", {})
    card = data.get("card", {})
    
    if not card.get("number"):
        return jsonify({"error": "card.number is required"}), 400
    if not card.get("expiration"):
        return jsonify({"error": "card.expiration is required"}), 400
    
    # Generate card_id if not provided
    import uuid
    card_id = data.get("card_id") or str(uuid.uuid4())
    
    new_card = {
        "card_id": card_id,
        "user": {
            "name": {
                "first_name": user.get("name", {}).get("first_name", ""),
                "last_name": user.get("name", {}).get("last_name", "")
            },
            "address": {
                "street": user.get("address", {}).get("street", ""),
                "street2": user.get("address", {}).get("street2", ""),
                "city": user.get("address", {}).get("city", ""),
                "region": user.get("address", {}).get("region", ""),
                "postal_code": user.get("address", {}).get("postal_code", ""),
                "country": user.get("address", {}).get("country", "US")
            },
            "phone_number": user.get("phone_number", "")
        },
        "card": {
            "number": card.get("number"),
            "expiration": card.get("expiration"),
            "cvv": card.get("cvv", "")
        }
    }
    
    saved_cards.append(new_card)
    
    # Return masked card info
    response_card = new_card.copy()
    response_card["card"] = {
        "number": f"****{card.get('number', '')[-4:]}",
        "expiration": card.get("expiration")
    }
    
    return jsonify({"message": "Card added successfully", "card": response_card}), 201

if __name__ == "__main__":
    app.run(port=5001, debug=True)
