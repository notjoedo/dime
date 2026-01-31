"""
Chat Routes
- AI chatbot using Snowflake Cortex
"""

from flask import Blueprint, request, jsonify
import traceback

chat_bp = Blueprint('chat', __name__, url_prefix='/api')


def get_snowflake():
    """Import snowflake lazily to avoid circular imports"""
    try:
        from snowflake_db import get_db
        return get_db()
    except Exception as e:
        print(f"Snowflake not available: {e}")
        return None


@chat_bp.route("/chat", methods=["POST"])
def chat():
    """Chat with financial data using Snowflake Cortex"""
    data = request.json
    user_id = data.get("user_id", "test_user")
    message = data.get("message")
    
    if not message:
        return jsonify({"error": "message is required"}), 400
        
    db = get_snowflake()
    if not db:
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
