"""
Analytics Routes
- Top of file data
- Cashflow analytics
- Alerts
"""

from flask import Blueprint, request, jsonify

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api')


def get_snowflake():
    try:
        from snowflake_db import get_db
        return get_db()
    except Exception as e:
        print(f"Snowflake not available: {e}")
        return None


@analytics_bp.route("/top-of-file", methods=["GET"])
def top_of_file():
    """Get top of file data - payment methods per merchant"""
    db = get_snowflake()
    if not db:
        return jsonify({"data": []})
    
    user_id = request.args.get("user_id", "test_user")
    
    try:
        merchants = db.get_merchants(user_id)
        return jsonify({"data": merchants})
    except Exception as e:
        return jsonify({"error": str(e), "data": []}), 200


@analytics_bp.route("/cashflow", methods=["GET", "POST"])
def cashflow():
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


@analytics_bp.route("/alerts", methods=["GET"])
def alerts():
    """Get alerts - spending anomalies, bill reminders, etc."""
    # Placeholder - in production, analyze transactions for:
    # - Unusual spending patterns
    # - Upcoming bills
    # - Category budget warnings
    return jsonify({"alerts": []})
