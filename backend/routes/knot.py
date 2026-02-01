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
    user_id = data.get("user_id", "aman")
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
    """Sync transactions from Knot API for a user and merchant (fetches ALL pages)"""
    data = request.json
    user_id = data.get("user_id") or "aman"
    merchant_id = data.get("merchant_id")
    
    url = "https://production.knotapi.com/transactions/sync"
    all_transactions = []
    current_cursor = None
    has_more = True
    page_count = 0
    
    try:
        while has_more and page_count < 20:  # Safety limit of 20 pages (2000 txs)
            payload = {
                "external_user_id": user_id,
                "merchant_id": int(merchant_id),
                "limit": 100  # Max limit per page
            }
            if current_cursor:
                payload["cursor"] = current_cursor
            
            response = requests.post(
                url,
                json=payload,
                auth=(KNOT_CLIENT_ID, KNOT_CLIENT_SECRET),
                headers={"Content-Type": "application/json"}
            )
            
            if not response.ok:
                print(f"Knot sync error: {response.text}")
                break
                
            data = response.json()
            transactions = data.get("transactions", [])
            
            if not transactions:
                has_more = False
                break
                
            all_transactions.extend(transactions)
            
            # Update cursor for next page
            current_cursor = data.get("next_cursor")
            has_more = bool(current_cursor)
            page_count += 1
            print(f"Synced page {page_count}: {len(transactions)} transactions")
        
        # Save all authentic transactions to Snowflake
        db = get_snowflake()
        saved_count = 0
        if db and all_transactions:
            try:
                # Use merchant info from last response
                merchant_info = data.get("merchant", {})
                result = db.save_transactions_batch(
                    all_transactions,
                    user_id,
                    int(merchant_id),
                    merchant_info.get("name", "Unknown")
                )
                saved_count = result.get("saved", 0)
            except Exception as e:
                print(f"Failed to save to Snowflake: {e}")
        
        return jsonify({
            "success": True, 
            "total_synced": len(all_transactions),
            "saved_to_db": saved_count,
            "pages": page_count
        })

    except Exception as e:
        return jsonify({"error": str(e), "transactions": []}), 500


@knot_bp.route("/sync-all", methods=["POST"])
def sync_all_merchants():
    """Sync transactions for all merchants connected to a user"""
    data = request.json
    user_id = data.get("user_id", "aman")
    
    db = get_snowflake()
    if not db:
        return jsonify({"error": "Snowflake not configured"}), 500
        
    try:
        merchants = db.get_merchants(user_id)
        sync_results = []
        
        for merchant in merchants:
            merchant_id = merchant.get("merchant_id")
            if not merchant_id:
                continue
                
            # Internal call to sync logic (simplified for batch)
            # In a real app, this would be a background task
            url = "https://production.knotapi.com/transactions/sync"
            payload = {
                "external_user_id": user_id,
                "merchant_id": int(merchant_id),
                "limit": 100
            }
            
            response = requests.post(
                url,
                json=payload,
                auth=(KNOT_CLIENT_ID, KNOT_CLIENT_SECRET),
                headers={"Content-Type": "application/json"}
            )
            
            if response.ok:
                data = response.json()
                txs = data.get("transactions", [])
                if txs:
                    db.save_transactions_batch(txs, user_id, int(merchant_id), merchant.get("name", "Unknown"))
                    sync_results.append({"merchant": merchant.get("name"), "synced": len(txs)})
            else:
                sync_results.append({"merchant": merchant.get("name"), "error": response.text})
                
        return jsonify({
            "success": True,
            "merchants_synced": len(sync_results),
            "details": sync_results
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


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
