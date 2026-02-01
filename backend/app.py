"""
Dime Backend - Main Application

A financial dashboard backend integrating:
- Knot API for transaction syncing
- Snowflake for data persistence and AI (Cortex)
- Card and merchant management
"""

from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Import and register all blueprints
from routes import (
    knot_bp,
    snowflake_bp,
    merchants_bp,
    cards_bp,
    analytics_bp,
    chat_bp,
    nessie_bp
)

app.register_blueprint(knot_bp)
app.register_blueprint(snowflake_bp)
app.register_blueprint(merchants_bp)
app.register_blueprint(cards_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(nessie_bp)


@app.route("/")
def index():
    return jsonify({
        "app": "Dime Backend",
        "version": "1.0.0",
        "endpoints": {
            "knot": "/api/knot/*",
            "snowflake": "/api/snowflake/*",
            "merchants": "/api/merchants/*",
            "cards": "/api/cards",
            "analytics": "/api/cashflow, /api/alerts, /api/top-of-file",
            "chat": "/api/chat"
        }
    })

@app.route("/api/classify-transactions", methods=["POST"])
def classify_transactions_legacy():
    """Legacy endpoint - redirects to snowflake blueprint"""
    from routes.snowflake_routes import classify
    return classify()


@app.route("/api/transactions", methods=["GET", "POST"])
def unified_transactions():
    """Unified transactions endpoint that calls Knot sync directly"""
    from routes.knot import sync_transactions
    return sync_transactions()


@app.route("/api/transactions/stored", methods=["GET", "POST"])
def stored_transactions_legacy():
    """Legacy endpoint - redirects to snowflake blueprint"""
    from routes.snowflake_routes import get_stored_transactions
    return get_stored_transactions()


if __name__ == "__main__":
    app.run(port=5001, debug=True)
