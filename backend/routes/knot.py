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


@knot_bp.route("/transactions", methods=["GET", "POST"])
def sync_transactions():
    """Sync transactions from Knot API (GET or POST)"""
    data = request.json if request.method == "POST" else request.args
    user_id = data.get("user_id") or "aman"
    merchant_id = data.get("merchant_id")
    
    db = get_snowflake()
    merchants = []
    if db:
        merchants = db.get_merchants(user_id)
        
    # Determine which merchants to sync
    merchants_to_sync = []
    if merchant_id:
        # Match specific merchant from the list
        matched = [m for m in merchants if str(m.get("merchant_id")) == str(merchant_id)]
        if matched:
            merchants_to_sync = matched
        else:
            # Fallback if merchant not in our DB yet
            merchants_to_sync = [{"merchant_id": merchant_id, "name": "Unknown"}]
    else:
        # Sync all connected merchants
        merchants_to_sync = merchants

    if not merchants_to_sync:
        # Fallback for empty DB (Bootstrapping)
        # User defined connected merchants: DoorDash (19), Amazon (44)
        merchants_to_sync = [
            {"merchant_id": 19, "name": "DoorDash"},
            {"merchant_id": 44, "name": "Amazon"}
        ]
    
    url = "https://production.knotapi.com/transactions/sync"
    all_transactions = []
    
    for m_info in merchants_to_sync:
        m_id = m_info.get("merchant_id")
        m_name = m_info.get("name")
        
        current_cursor = None
        has_more = True
        merchant_txs = []
        
        try:
            # Simple sync call for these transactions
            payload = {
                "external_user_id": user_id,
                "merchant_id": int(m_id),
                "limit": 50
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
                
                # Enforce flattened info into transaction for frontend
                for tx in txs:
                    if not tx.get("merchant_name"):
                        tx["merchant_name"] = m_name or tx.get("merchant", {}).get("name")
                    if not tx.get("merchant_id"):
                        tx["merchant_id"] = m_id or tx.get("merchant", {}).get("id")
                    if not tx.get("total_amount"):
                        tx["total_amount"] = tx.get("price", {}).get("total") or tx.get("total")
                    if not tx.get("payment_method") and tx.get("payment_methods"):
                        px = tx.get("payment_methods")[0]
                        tx["payment_method"] = px.get("brand") or px.get("type")
                        
                all_transactions.extend(txs)
                
                # Save to Snowflake in background (simplified)
                if db and txs:
                    db.save_transactions_batch(txs, user_id, int(m_id), m_name)
                    
        except Exception as e:
            print(f"Error syncing merchant {m_id}: {e}")

    # Sort all aggregated transactions by date
    all_transactions.sort(key=lambda x: x.get("datetime", ""), reverse=True)
    
    return jsonify({
        "success": True, 
        "total": len(all_transactions),
        "transactions": all_transactions
    })




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
