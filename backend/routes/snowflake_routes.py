"""
Snowflake Management Routes
- Setup tables
- Test connection
- Classify transactions
- Get stored transactions
"""

from flask import Blueprint, request, jsonify

snowflake_bp = Blueprint('snowflake', __name__, url_prefix='/api/snowflake')


def get_snowflake():
    """Import snowflake lazily to avoid circular imports"""
    try:
        from snowflake_db import get_db
        return get_db()
    except Exception as e:
        print(f"Snowflake not available: {e}")
        return None


@snowflake_bp.route("/setup", methods=["POST"])
def setup():
    """Setup Snowflake tables and category embeddings"""
    db = get_snowflake()
    if not db:
        return jsonify({"error": "Snowflake not configured"}), 500
    
    try:
        db.setup_tables()
        db.populate_category_embeddings()
        return jsonify({"success": True, "message": "Snowflake setup complete"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@snowflake_bp.route("/test", methods=["GET"])
def test():
    """Test Snowflake connection"""
    db = get_snowflake()
    if not db:
        return jsonify({"connected": False, "error": "Snowflake not configured"})
    return jsonify(db.test_connection())


@snowflake_bp.route("/classify", methods=["POST"])
def classify():
    """Classify all uncategorized transactions using vector search"""
    db = get_snowflake()
    if not db:
        return jsonify({"error": "Snowflake not configured"}), 500
    
    try:
        result = db.classify_all_unclassified()
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@snowflake_bp.route("/transactions", methods=["GET", "POST"])
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
