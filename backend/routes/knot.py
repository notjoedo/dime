"""
Knot API Routes
- Session creation
- Transaction syncing  
- Webhook handling
"""

from flask import Blueprint, request, jsonify
import os
import requests

knot_bp = Blueprint('knot', __name__, url_prefix='/api/knot')

KNOT_CLIENT_ID = os.getenv("KNOT_CLIENT_ID")
KNOT_CLIENT_SECRET = os.getenv("KNOT_CLIENT_SECRET")
PHOTON_SERVER_URL = os.getenv("PHOTON_SERVER_URL", "http://localhost:4000")

# In-memory transaction storage
saved_transactions = []


def get_snowflake():
    """Import snowflake lazily to avoid circular imports"""
    try:
        from snowflake_db import get_db
        return get_db()
    except Exception as e:
        print(f"Snowflake not available: {e}")
        return None


@knot_bp.route("/config", methods=["GET"])
def get_config():
    """Expose Knot client ID to the frontend"""
    return jsonify({"client_id": KNOT_CLIENT_ID})


@knot_bp.route("/create-session", methods=["POST"])
def create_session():
    """Create a Knot session for the frontend SDK"""
    data = request.json
    user_id = data.get("user_id", "test_user")
    product = data.get("product", "transaction_link")
    
    url = "https://production.knotapi.com/session/create"
    payload = {
        "type": product,
        "external_user_id": user_id
    }
    
    try:
        response = requests.post(
            url,
            json=payload,
            auth=(KNOT_CLIENT_ID, KNOT_CLIENT_SECRET),
            headers={"Content-Type": "application/json"}
        )
        
        data = response.json()
        if response.ok:
            return jsonify({"session_id": data.get("session")})
        else:
            return jsonify({"error": data.get("error_message", "Unknown error")}), response.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@knot_bp.route("/transactions", methods=["POST"])
def sync_transactions():
    """Sync transactions from Knot API for a user and merchant"""
    data = request.json
    user_id = data.get("user_id")
    merchant_id = data.get("merchant_id")
    cursor = data.get("cursor")
    
    url = "https://production.knotapi.com/transactions/sync"
    payload = {
        "external_user_id": user_id,
        "merchant_id": int(merchant_id)
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
        
        # Check if response has content
        if not response.text:
            return jsonify({"error": "Empty response from Knot API", "transactions": []}), 502
        
        # Try to parse JSON
        try:
            data = response.json()
        except Exception as parse_error:
            return jsonify({
                "error": f"Invalid JSON from Knot: {str(parse_error)}", 
                "raw": response.text[:200],
                "transactions": []
            }), 502
        
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
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Network error: {str(e)}", "transactions": []}), 503
    except Exception as e:
        return jsonify({"error": str(e), "transactions": []}), 500


@knot_bp.route("/webhook", methods=["GET", "POST"])
def webhook():
    """Handle Knot webhooks - saves transactions to Snowflake"""
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
