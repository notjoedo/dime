"""
Merchant Management Routes
- List connected merchants
- Add new merchant
- Update payment method
- Delete merchant
"""

from flask import Blueprint, request, jsonify

merchants_bp = Blueprint('merchants', __name__, url_prefix='/api/merchants')


def get_snowflake():
    """Import snowflake lazily to avoid circular imports"""
    try:
        from snowflake_db import get_db
        return get_db()
    except Exception as e:
        print(f"Snowflake not available: {e}")
        return None


@merchants_bp.route("", methods=["GET", "POST"])
def manage():
    """Get or add connected merchants"""
    db = get_snowflake()
    data = request.json if request.method == "POST" else {}
    user_id = data.get("user_id", request.args.get("user_id", "test_user"))
    
    if request.method == "POST":
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


@merchants_bp.route("/<int:merchant_id>", methods=["PUT", "DELETE"])
def update(merchant_id):
    """Update or delete a merchant"""
    db = get_snowflake()
    if not db:
        return jsonify({"error": "Snowflake not configured"}), 500
    
    data = request.json if request.method == "PUT" else {}
    user_id = data.get("user_id", request.args.get("user_id", "test_user"))
    
    if request.method == "PUT":
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
