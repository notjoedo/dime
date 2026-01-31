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

# Snowflake integration (lazy loaded to avoid blocking startup)
snowflake_db = None
def get_snowflake():
    global snowflake_db
    if snowflake_db is None:
        try:
            from snowflake_db import get_db
            snowflake_db = get_db()
        except Exception as e:
            print(f"Snowflake not available: {e}")
    return snowflake_db

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
        data = response.json()
        
        # Save transactions to Snowflake if available
        db = get_snowflake()
        if db and response.ok and "transactions" in data:
            try:
                merchant_info = data.get("merchant", {})
                db.save_transactions_batch(
                    data["transactions"],
                    user_id,
                    int(merchant_id),
                    merchant_info.get("name", "Unknown")
                )
            except Exception as e:
                print(f"Failed to save to Snowflake: {e}")
        
        return jsonify(data), response.status_code
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
            
            # Save to Snowflake
            db = get_snowflake()
            if db and txs:
                for tx in txs:
                    try:
                        merchant = tx.get("merchant", {})
                        merchant_id = merchant.get("id", 0)
                        merchant_name = merchant.get("name", "Unknown")
                        # Detect payment method from transaction if available
                        payment_method = tx.get("payment_method", tx.get("card_type", None))
                        
                        db.save_transaction_with_payment_update(
                            tx,
                            payload.get("user_id", "webhook_user"),
                            int(merchant_id) if merchant_id else 0,
                            merchant_name,
                            payment_method
                        )
                    except Exception as e:
                        print(f"Webhook: Failed to save transaction: {e}")
            
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
    return jsonify({"data": []})


@app.route("/api/cashflow", methods=["GET", "POST"])
def get_cashflow():
    """Get cashflow analytics from Snowflake"""
    db = get_snowflake()
    if not db:
        return jsonify({"error": "Snowflake not configured", "by_category": []}), 200
    
    data = request.json if request.method == "POST" else {}
    user_id = data.get("user_id", request.args.get("user_id", "test_user"))
    days = int(data.get("days", request.args.get("days", 30)))
    
    try:
        result = db.get_cashflow(user_id, days)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e), "by_category": []}), 200


@app.route("/api/alerts", methods=["GET"])
def get_alerts():
    """Get alerts - placeholder"""
    return jsonify({"alerts": []})


# --- Snowflake Management ---

@app.route("/api/snowflake/setup", methods=["POST"])
def setup_snowflake():
    """Setup Snowflake tables and category embeddings"""
    db = get_snowflake()
    if not db:
        return jsonify({"error": "Snowflake not configured"}), 500
    
    try:
        # Create tables
        db.setup_tables()
        # Populate category embeddings
        db.populate_category_embeddings()
        return jsonify({"success": True, "message": "Snowflake setup complete"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/snowflake/test", methods=["GET"])
def test_snowflake():
    """Test Snowflake connection"""
    db = get_snowflake()
    if not db:
        return jsonify({"connected": False, "error": "Snowflake not configured"})
    return jsonify(db.test_connection())


@app.route("/api/classify-transactions", methods=["POST"])
def classify_transactions():
    """Classify all uncategorized transactions using vector search"""
    db = get_snowflake()
    if not db:
        return jsonify({"error": "Snowflake not configured"}), 500
    
    try:
        result = db.classify_all_unclassified()
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/transactions/stored", methods=["GET", "POST"])
def get_stored_transactions():
    """Get transactions stored in Snowflake"""
    db = get_snowflake()
    if not db:
        return jsonify({"error": "Snowflake not configured", "transactions": []}), 200
    
    data = request.json if request.method == "POST" else {}
    user_id = data.get("user_id", request.args.get("user_id", "test_user"))
    merchant_id = data.get("merchant_id", request.args.get("merchant_id"))
    limit = int(data.get("limit", request.args.get("limit", 50)))
    
    try:
        transactions = db.get_transactions(user_id, int(merchant_id) if merchant_id else None, limit)
        return jsonify({"transactions": transactions})
    except Exception as e:
        return jsonify({"error": str(e), "transactions": []}), 200


# --- Merchant Management ---

@app.route("/api/merchants", methods=["GET", "POST"])
def manage_merchants():
    """Get or add connected merchants"""
    db = get_snowflake()
    data = request.json if request.method == "POST" else {}
    user_id = data.get("user_id", request.args.get("user_id", "test_user"))
    
    if request.method == "POST":
        # Add a new merchant
        merchant_id = data.get("merchant_id")
        name = data.get("name", "")
        logo_url = data.get("logo_url", "")
        
        if not merchant_id:
            return jsonify({"error": "merchant_id is required"}), 400
        
        if db:
            try:
                result = db.save_merchant(int(merchant_id), user_id, name, logo_url)
                return jsonify(result)
            except Exception as e:
                return jsonify({"error": str(e)}), 500
        return jsonify({"success": True, "merchant_id": merchant_id, "note": "Snowflake not configured"})
    
    # GET - list merchants
    if db:
        try:
            merchants = db.get_merchants(user_id)
            return jsonify({"merchants": merchants})
        except Exception as e:
            return jsonify({"error": str(e), "merchants": []}), 200
    return jsonify({"merchants": [], "note": "Snowflake not configured"})


@app.route("/api/merchants/<int:merchant_id>", methods=["PUT", "DELETE"])
def update_merchant(merchant_id):
    """Update or delete a merchant"""
    db = get_snowflake()
    if not db:
        return jsonify({"error": "Snowflake not configured"}), 500
    
    data = request.json if request.method == "PUT" else {}
    user_id = data.get("user_id", request.args.get("user_id", "test_user"))
    
    if request.method == "PUT":
        # Update payment method
        payment_method = data.get("top_of_file_payment", data.get("payment_method"))
        if payment_method:
            try:
                result = db.update_merchant_payment(merchant_id, user_id, payment_method)
                return jsonify(result)
            except Exception as e:
                return jsonify({"error": str(e)}), 500
        return jsonify({"error": "payment_method is required"}), 400
    
    # DELETE
    try:
        result = db.delete_merchant(merchant_id, user_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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

import traceback

@app.route("/api/chat", methods=["POST"])
def chat():
    """Chat with financial data using Snowflake Cortex"""
    data = request.json
    user_id = data.get("user_id", "test_user")
    message = data.get("message")
    
    if not message:
        return jsonify({"error": "message is required"}), 400
        
    db = get_snowflake()
    if not db:
        # Fallback if Snowflake is not configured
        return jsonify({
            "response": "I'm sorry, I don't have access to your financial records right now. Please make sure your account is connected."
        })
        
    try:
        # 1. Get transaction history
        transactions = db.get_transactions(user_id, limit=20)
        
        # 2. Get card info
        cards = db.get_cards(user_id)
        
        # 3. Construct prompt
        context = "You are Dime, a helpful financial assistant. You help users manage their cards and understand their spending.\n\n"
        context += "Here is the user's financial data:\n\n"
        
        context += "RECENT TRANSACTIONS:\n"
        if transactions:
            for tx in transactions:
                date = tx.get('datetime', 'Unknown date')
                merchant = tx.get('merchant_name', 'Unknown merchant')
                amount = tx.get('total_amount', 0)
                cat = tx.get('category', 'Uncategorized')
                context += f"- {date}: {merchant} - ${amount} ({cat})\n"
        else:
            context += "No recent transactions found.\n"
            
        context += "\nSAVED CARDS:\n"
        if cards:
            for card in cards:
                card_type = card.get('card_type', 'Unknown')
                last_four = card.get('last_four', '****')
                holder = card.get('cardholder', 'Unknown')
                context += f"- {card_type} card ending in {last_four} (Holder: {holder})\n"
        else:
            # Check in-memory cards as well
            if saved_cards:
                for card in saved_cards:
                    c = card.get('card', {})
                    num = c.get('number', '')[-4:] if c.get('number') else '****'
                    context += f"- Card ending in {num}\n"
            else:
                context += "No cards saved.\n"
            
        context += "\nInstructions: Use the data above to answer the user's question accurately. If you don't know the answer based on the data, say so. Keep your response concise and helpful."
        
        full_prompt = f"{context}\n\nUser Question: {message}\n\nAssistant Response:"
        
        # 4. Call LLM
        response = db.complete(full_prompt)
        
        return jsonify({"response": response})
    except Exception as e:
        print(f"Chat error: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5001, debug=True)
