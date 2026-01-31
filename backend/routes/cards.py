"""
Card Management Routes
- List saved cards
- Add new card
- Optimal card recommendation
"""

from flask import Blueprint, request, jsonify
import uuid

cards_bp = Blueprint('cards', __name__, url_prefix='/api')

# In-memory card storage (replace with database in production)
saved_cards = []


def get_snowflake():
    """Import snowflake lazily to avoid circular imports"""
    try:
        from snowflake_db import get_db
        return get_db()
    except Exception as e:
        print(f"Snowflake not available: {e}")
        return None


@cards_bp.route("/cards", methods=["GET", "POST"])
def manage():
    """
    GET: List all saved cards
    POST: Add a new card with billing address
    """
    global saved_cards
    
    if request.method == "GET":
        # Try Snowflake first
        db = get_snowflake()
        if db:
            try:
                cards = db.get_cards()
                return jsonify({"cards": cards})
            except Exception as e:
                print(f"Snowflake cards error: {e}")
        
        # Fallback to in-memory
        masked_cards = []
        for card in saved_cards:
            c = card.get("card", {})
            num = c.get("number", "")
            masked_cards.append({
                "card_id": card.get("card_id"),
                "user": card.get("user"),
                "card": {
                    "number": f"****{num[-4:]}" if len(num) >= 4 else "****",
                    "expiration": c.get("expiration")
                }
            })
        return jsonify({"cards": masked_cards})
    
    # POST - add new card
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    user_info = data.get("user", {})
    card_info = data.get("card", {})
    
    card_id = data.get("card_id", str(uuid.uuid4()))
    
    new_card = {
        "card_id": card_id,
        "user": user_info,
        "card": card_info
    }
    saved_cards.append(new_card)
    
    # Also save to Snowflake if available
    db = get_snowflake()
    if db:
        try:
            db.save_card(new_card, user_info.get("name", {}).get("first_name", "user"))
        except Exception as e:
            print(f"Failed to save card to Snowflake: {e}")
    
    # Return masked card
    num = card_info.get("number", "")
    response_card = {
        "card_id": card_id,
        "user": user_info,
        "card": {
            "number": f"****{num[-4:]}" if len(num) >= 4 else "****",
            "expiration": card_info.get("expiration")
        }
    }
    
    return jsonify({"message": "Card added successfully", "card": response_card}), 201


@cards_bp.route("/optimal-card", methods=["POST"])
def optimal():
    """
    Get the optimal card for a given merchant
    
    Request body:
    {
        "merchant": "Amazon" or merchant_id,
        "category": "optional category like 'groceries', 'travel', etc."
    }
    """
    data = request.json
    merchant = data.get("merchant", "")
    category = data.get("category", "").lower()
    
    if not saved_cards:
        return jsonify({
            "recommendation": None,
            "message": "No cards saved yet. Add a card first."
        })
    
    # Simple logic - in production, use actual reward rates
    best_card = None
    reason = "Default card selection"
    
    # Category-based recommendations
    category_preferences = {
        "groceries": ["amex", "discover"],
        "dining": ["amex", "visa"],
        "travel": ["amex", "visa"],
        "gas": ["discover", "visa"],
        "streaming": ["visa", "mastercard"],
        "shopping": ["amex", "discover"],
    }
    
    preferred_types = category_preferences.get(category, [])
    
    for card in saved_cards:
        card_info = card.get("card", {})
        card_type = card_info.get("card_type", "").lower()
        
        if card_type in preferred_types:
            best_card = card
            reason = f"Best for {category} purchases"
            break
    
    if not best_card:
        best_card = saved_cards[0]
        reason = "Default card (add card types for better recommendations)"
    
    card_info = best_card.get("card", {})
    num = card_info.get("number", "")
    
    return jsonify({
        "recommendation": {
            "card_id": best_card.get("card_id"),
            "card_type": card_info.get("card_type", "unknown"),
            "last_four": num[-4:] if len(num) >= 4 else "****",
            "reason": reason
        },
        "merchant": merchant,
        "category": category
    })
