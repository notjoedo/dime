"""
Card Management Routes
- List saved cards
- Add new card (Encrypted)
- Optimal card recommendation (Benefits-aware)
"""

from flask import Blueprint, request, jsonify
import uuid

cards_bp = Blueprint('cards', __name__, url_prefix='/api')

def get_snowflake():
    try:
        from snowflake_db import get_db
        return get_db()
    except Exception as e:
        print(f"Snowflake not available: {e}")
        return None

@cards_bp.route("/cards", methods=["GET", "POST"])
def manage():
    db = get_snowflake()
    if not db:
        return jsonify({"error": "Snowflake not configured", "cards": []}), 500

    if request.method == "POST":
        data = request.json
        user_id = data.get("user_id", "aman")
        
        # Ensure card_id presence
        if "card_id" not in data:
            data["card_id"] = str(uuid.uuid4())
            
        try:
            print(f"Adding card for user {user_id}: {data.get('card_number', '')[-4:]}")
            result = db.save_card(data, user_id)
            return jsonify(result), 201
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"❌ Card Save Error: {e}\n{error_details}")
            return jsonify({
                "error": str(e),
                "details": error_details
            }), 500
            
    # GET
    try:
        user_id = request.args.get("user_id", "aman")
        cards = db.get_cards(user_id)
        return jsonify({"cards": cards})
    except Exception as e:
        return jsonify({"error": str(e), "cards": []}), 500

@cards_bp.route("/cards/<card_id>", methods=["DELETE"])
def delete_card_route(card_id):
    db = get_snowflake()
    if not db:
        return jsonify({"error": "Snowflake not configured"}), 500
    
    user_id = request.args.get("user_id", "aman")
    success = db.delete_card(card_id, user_id)
    
    if success:
        return jsonify({"success": True}), 200
    else:
        return jsonify({"error": "Failed to delete card"}), 500

@cards_bp.route("/optimal-card", methods=["POST"])
def optimal():
    """Get the optimal card based on BENEFITS and CATEGORY"""
    db = get_snowflake()
    if not db:
        return jsonify({"recommendation": None, "message": "Snowflake not connected"})
        
    data = request.json
    user_id = data.get("user_id", "aman")
    merchant = data.get("merchant", "")
    category = data.get("category", "").lower()
    
    try:
        cards = db.get_cards(user_id)
        if not cards:
            return jsonify({"recommendation": None, "message": "No cards found"})
            
        best_card = None
        best_score = -1
        reason = "Default card"
        
        # Scoring logic
        # 1. Benefits match (+10)
        # 2. Category preference (+5)
        
        category_preferences = {
            "groceries": ["amex", "discover"],
            "dining": ["amex", "visa"],
            "travel": ["amex", "visa"],
            "gas": ["discover", "visa"],
            "streaming": ["visa", "mastercard"],
            "shopping": ["amex", "discover"],
        }
        
        preferred_types = category_preferences.get(category, [])
        
        for card in cards:
            score = 0
            current_reason = "Good general spending card"
            
            benefits = card.get("benefits", "").lower()
            card_type = card.get("card_type", "").lower()
            
            # Check benefits text
            if category and category in benefits:
                score += 10
                current_reason = f"Benefits explicitly mention '{category}'"
            elif "everything" in benefits or "all purchases" in benefits:
                score += 2
                current_reason = "Earns on all purchases"
                
            # Check card type preference
            if card_type in preferred_types:
                score += 5
                if score < 10: # Don't overwrite specific benefit reason
                    current_reason = f"{card_type.title()} is typically good for {category}"
            
            if score > best_score:
                best_score = score
                best_card = card
                reason = current_reason
        
        if not best_card:
            best_card = cards[0]
            
        return jsonify({
            "recommendation": {
                "card_id": best_card.get("card_id"),
                "card_type": best_card.get("card_type"),
                "last_four": best_card.get("last_four"),
                "reason": reason,
                "benefits": best_card.get("benefits")
            },
            "merchant": merchant,
            "category": category
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500
