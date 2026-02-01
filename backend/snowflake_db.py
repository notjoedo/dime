"""
Snowflake Database Module for Dime

Provides connection management and operations for:
- Cards storage (encrypted PAN)
- Transactions storage with embeddings
- Vector classification using Cortex EMBED_TEXT_768
"""

import os
import json
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

# Snowflake connection settings from environment
SNOWFLAKE_CONFIG = {
    "account": os.getenv("SNOWFLAKE_ACCOUNT"),
    "user": os.getenv("SNOWFLAKE_USER"),
    "password": os.getenv("SNOWFLAKE_PASSWORD"),
    "database": os.getenv("SNOWFLAKE_DATABASE", "DIME"),
    "schema": os.getenv("SNOWFLAKE_SCHEMA", "PUBLIC"),
    "warehouse": os.getenv("SNOWFLAKE_WAREHOUSE", "COMPUTE_WH"),
}

# Condensed spend categories for AI classification
SPEND_CATEGORIES = [
    "food_dining",      # Restaurants, food delivery, coffee, DoorDash, UberEats
    "groceries",        # Supermarkets, grocery stores, farmers markets
    "gas_auto",         # Gas stations, automotive services, car maintenance
    "shopping",         # Retail, department stores, Amazon, Walmart, online merchants
    "travel",           # Airlines, hotels, rental cars, rideshare (Uber, Lyft)
    "entertainment",    # Streaming, movies, concerts, gaming, subscriptions
    "healthcare",       # Pharmacies, doctors, hospitals, medical supplies
    "services",         # Government, education, utilities, professional services
    "home",             # Home improvement, furniture, appliances, repairs
    "other"             # Uncategorized transactions
]

# Legacy categories for backward compatibility with vector embeddings
CATEGORIES = [
    ("food_dining", "Restaurant food delivery takeout cafe coffee shop bar dining DoorDash UberEats Grubhub"),
    ("groceries", "Grocery store supermarket produce vegetables fruits meat dairy Walmart Target Whole Foods"),
    ("gas_auto", "Gas station fuel petrol gasoline car vehicle automotive maintenance repair"),
    ("shopping", "Amazon retail online shopping ecommerce clothes electronics department store merchandise"),
    ("travel", "Airline hotel flight booking vacation trip travel transportation Uber Lyft rideshare"),
    ("entertainment", "Netflix Hulu Disney streaming subscription video music movies concerts gaming Spotify"),
    ("healthcare", "Pharmacy doctor hospital medical prescription health insurance CVS Walgreens"),
    ("services", "Government education utilities professional services electric water internet phone bill"),
    ("home", "Home improvement furniture appliances repair Lowes Home Depot IKEA"),
    ("other", "Miscellaneous general purchase uncategorized"),
]

# Card encryption key
ENCRYPTION_KEY = os.getenv("CARD_ENCRYPTION_KEY")

def encrypt_card_data(data: str) -> str:
    """Encrypt sensitive card data using Fernet"""
    if not ENCRYPTION_KEY or not data:
        return ""
    from cryptography.fernet import Fernet
    f = Fernet(ENCRYPTION_KEY.encode())
    return f.encrypt(data.encode()).decode()

def decrypt_card_data(encrypted: str) -> str:
    """Decrypt card data"""
    if not ENCRYPTION_KEY or not encrypted:
        return ""
    from cryptography.fernet import Fernet
    f = Fernet(ENCRYPTION_KEY.encode())
    return f.decrypt(encrypted.encode()).decode()


class SnowflakeDB:
    """Snowflake database operations for Dime"""
    
    def __init__(self):
        self._connection = None
        self._cursor = None
    
    def _get_connection(self):
        """Get or create Snowflake connection"""
        if self._connection is None:
            try:
                import snowflake.connector
                self._connection = snowflake.connector.connect(
                    account=SNOWFLAKE_CONFIG["account"],
                    user=SNOWFLAKE_CONFIG["user"],
                    password=SNOWFLAKE_CONFIG["password"],
                    database=SNOWFLAKE_CONFIG["database"],
                    schema=SNOWFLAKE_CONFIG["schema"],
                    warehouse=SNOWFLAKE_CONFIG["warehouse"],
                )
                self._cursor = self._connection.cursor()
            except Exception as e:
                raise Exception(f"Failed to connect to Snowflake: {e}")
        return self._connection, self._cursor
    
    def test_connection(self) -> bool:
        """Test the Snowflake connection"""
        try:
            conn, cursor = self._get_connection()
            cursor.execute("SELECT CURRENT_VERSION()")
            result = cursor.fetchone()
            return {"connected": True, "version": result[0]}
        except Exception as e:
            return {"connected": False, "error": str(e)}
    
    def close(self):
        """Close the connection"""
        if self._cursor:
            self._cursor.close()
        if self._connection:
            self._connection.close()
        self._connection = None
        self._cursor = None
    
    # ========== Schema Setup ==========
    
    def setup_tables(self):
        """Create required tables if they don't exist"""
        conn, cursor = self._get_connection()
        
        # First, create database and schema if they don't exist
        db_name = SNOWFLAKE_CONFIG["database"]
        schema_name = SNOWFLAKE_CONFIG["schema"]
        warehouse = SNOWFLAKE_CONFIG["warehouse"]
        
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name}")
        cursor.execute(f"USE DATABASE {db_name}")
        cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {schema_name}")
        cursor.execute(f"USE SCHEMA {schema_name}")
        cursor.execute(f"USE WAREHOUSE {warehouse}")
        
        # Cards table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS CARDS (
                card_id VARCHAR PRIMARY KEY,
                user_id VARCHAR,
                card_type VARCHAR(20),
                card_number_encrypted VARCHAR,
                cvv_encrypted VARCHAR,
                card_last_four VARCHAR(4),
                expiration VARCHAR(10),
                cardholder_name VARCHAR,
                billing_address VARCHAR,
                billing_city VARCHAR,
                billing_state VARCHAR(10),
                billing_zip VARCHAR(10),
                benefits TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
            )
        """)
        
        # Add columns if they don't exist (for existing tables)
        columns_to_add = [
            "card_type VARCHAR(20)", 
            "benefits TEXT", 
            "cvv_encrypted VARCHAR", 
            "cardholder_name VARCHAR",
            "billing_address VARCHAR",
            "billing_state VARCHAR(20)",
            "billing_zip VARCHAR(20)"
        ]
        for col_def in columns_to_add:
            try:
                # Snowflake ALTER TABLE ADD COLUMN IF NOT EXISTS requires this syntax
                cursor.execute(f"ALTER TABLE CARDS ADD COLUMN IF NOT EXISTS {col_def}")
            except Exception as e:
                print(f"Note: Could not add column {col_def}: {e}")
        
        
        # Transactions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS TRANSACTIONS (
                id VARCHAR PRIMARY KEY,
                external_id VARCHAR,
                user_id VARCHAR,
                merchant_id INTEGER,
                merchant_name VARCHAR,
                datetime TIMESTAMP,
                order_status VARCHAR,
                total_amount DECIMAL(10,2),
                currency VARCHAR(3),
                category VARCHAR,
                category_confidence FLOAT,
                spend_category VARCHAR(50),
                points_earned INTEGER DEFAULT 0,
                payment_method VARCHAR(50),
                card_id VARCHAR,
                product_text VARCHAR,
                raw_json VARIANT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
            )
        """)
        
        # Add new columns if they don't exist (for existing tables)
        tx_columns = [
            "spend_category VARCHAR(50)",
            "points_earned INTEGER DEFAULT 0",
            "payment_method VARCHAR(50)",
            "card_id VARCHAR"
        ]
        for col_def in tx_columns:
            try:
                cursor.execute(f"ALTER TABLE TRANSACTIONS ADD COLUMN IF NOT EXISTS {col_def}")
            except Exception as e:
                print(f"Note: Could not add column {col_def}: {e}")
        
        # Category embeddings table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS CATEGORY_EMBEDDINGS (
                category VARCHAR PRIMARY KEY,
                description VARCHAR,
                embedding VECTOR(FLOAT, 768)
            )
        """)
        
        # Merchants table - connected merchants with top-of-file payment method
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS MERCHANTS (
                merchant_id INTEGER PRIMARY KEY,
                user_id VARCHAR,
                name VARCHAR,
                logo_url VARCHAR,
                top_of_file_payment VARCHAR DEFAULT 'paypal',
                connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
                last_transaction_at TIMESTAMP
            )
        """)
        
        conn.commit()
        return {"success": True, "message": "Database, schema, and tables created"}

    def reset_database(self):
        """DROP and RECREATE all tables"""
        conn, cursor = self._get_connection()
        try:
            # Drop tables individually
            cursor.execute("DROP TABLE IF EXISTS TRANSACTIONS")
            cursor.execute("DROP TABLE IF EXISTS CARDS")
            cursor.execute("DROP TABLE IF EXISTS MERCHANTS")
            cursor.execute("DROP TABLE IF EXISTS CATEGORY_EMBEDDINGS")
            conn.commit()
            return self.setup_tables()
        except Exception as e:
            conn.rollback()
            raise e
    
    def populate_category_embeddings(self):
        """Pre-compute embeddings for categories using Cortex"""
        conn, cursor = self._get_connection()
        
        for category, description in CATEGORIES:
            cursor.execute("""
                MERGE INTO CATEGORY_EMBEDDINGS AS target
                USING (
                    SELECT 
                        %s AS category,
                        %s AS description,
                        SNOWFLAKE.CORTEX.EMBED_TEXT_768('snowflake-arctic-embed-m-v1.5', %s) AS embedding
                ) AS source
                ON target.category = source.category
                WHEN NOT MATCHED THEN
                    INSERT (category, description, embedding)
                    VALUES (source.category, source.description, source.embedding)
            """, (category, description, description))
        
        conn.commit()
        return {"success": True, "categories": len(CATEGORIES)}
    
    # ========== Card Operations ==========
    
    def save_card(self, card_data: Dict[str, Any], user_id: str = "aman") -> Dict[str, Any]:
        """Save a card with encryption and full address"""
        conn, cursor = self._get_connection()
        
        card_id = card_data.get("card_id") or str(uuid.uuid4())
        card_number = card_data.get("card_number", "")
        cvv = card_data.get("cvv", "")
        last_four = card_number[-4:] if len(card_number) >= 4 else "****"
        
        # Super simple encryption fallback
        try:
            enc_number = encrypt_card_data(card_number)
            enc_cvv = encrypt_card_data(cvv)
        except:
            enc_number = f"plain_{card_number}"
            enc_cvv = f"plain_{cvv}"

        try:
            cursor.execute("""
                INSERT INTO CARDS (
                    card_id, user_id, card_type, card_number_encrypted, 
                    cvv_encrypted, card_last_four, expiration, cardholder_name,
                    billing_address, billing_city, billing_state, billing_zip, benefits
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                card_id, user_id, card_data.get("card_type", "unknown"),
                enc_number, enc_cvv, last_four, 
                card_data.get("expiration", ""), 
                card_data.get("cardholder_name") or card_data.get("cardholder", ""),
                card_data.get("billing_address", ""),
                card_data.get("billing_city", ""),
                card_data.get("billing_state", ""),
                card_data.get("billing_zip", ""),
                card_data.get("benefits", "")
            ))
            conn.commit()
            return {"success": True, "card_id": card_id}
        except Exception as e:
            print(f"❌ ERROR saving card: {e}")
            raise e

    def delete_card(self, card_id: str, user_id: str = "aman") -> bool:
        """Delete a card from Snowflake"""
        conn, cursor = self._get_connection()
        try:
            cursor.execute("DELETE FROM CARDS WHERE card_id = %s AND user_id = %s", (card_id, user_id))
            conn.commit()
            return True
        except Exception as e:
            print(f"❌ ERROR deleting card: {e}")
            return False
    
    def get_cards(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get cards from Snowflake (masked numbers)"""
        conn, cursor = self._get_connection()
        
        query = """
            SELECT card_id, card_type, card_last_four, expiration, 
                   cardholder_name, billing_city, billing_state, benefits, created_at
            FROM CARDS
        """
        
        if user_id:
            query += " WHERE user_id = %s"
            params = (user_id,)
        else:
            params = ()
            
        query += " ORDER BY created_at DESC"
        
        cursor.execute(query, params)
        
        rows = cursor.fetchall()
        cards = []
        for row in rows:
            # Try to infer cardholder if name column was old format
            cardholder = row[4] if row[4] else "Unknown User"
            
            cards.append({
                "card_id": row[0],
                "card_type": row[1] or "Unknown",
                "last_four": row[2],
                "card_number": f"****{row[2]}",
                "expiration": row[3],
                "cardholder": cardholder,
                "location": f"{row[5]}, {row[6]}".strip(", "),
                "benefits": row[7] or "",
                "created_at": str(row[8]) if row[8] else None,
            })
        return cards
    
    # ========== Transaction Operations ==========
    
    def save_transaction(self, tx: Dict[str, Any], user_id: str, merchant_id: int, merchant_name: str, commit: bool = True) -> Dict[str, Any]:
        """Save a transaction to Snowflake"""
        conn, cursor = self._get_connection()
        
        tx_id = tx.get("id", "")
        products = tx.get("products", [])
        product_text = " ".join([p.get("name", "") for p in products[:10]])  # First 10 products
        
        price = tx.get("price", {})
        total = price.get("total", "0")
        
        # Extract payment method and card_id from Knot transaction
        payment_methods = tx.get("payment_methods", [])
        payment_method = None
        card_id = tx.get("card_id") or tx.get("account_id") # Try Knot fields
        
        if payment_methods:
            pm = payment_methods[0]
            # Check type first (PAYPAL, CARD, etc.), then brand (VISA, PAYPAL, etc.)
            pm_type = pm.get("type", "").upper()
            pm_brand = pm.get("brand", "").upper()
            if not card_id:
                card_id = pm.get("external_id") # Fallback to payment method external id
                
            if pm_type == "PAYPAL" or pm_brand == "PAYPAL":
                payment_method = "PAYPAL"
            else:
                payment_method = pm_brand or pm_type or "CARD"
        
        cursor.execute("""
            MERGE INTO TRANSACTIONS AS target
            USING (SELECT %s AS id) AS source
            ON target.id = source.id
            WHEN NOT MATCHED THEN
                INSERT (id, external_id, user_id, merchant_id, merchant_name,
                        datetime, order_status, total_amount, currency, payment_method, 
                        card_id, product_text, raw_json)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, PARSE_JSON(%s))
            WHEN MATCHED THEN
                UPDATE SET payment_method = %s, card_id = COALESCE(target.card_id, %s)
        """, (
            tx_id,
            tx_id,
            tx.get("external_id", ""),
            user_id,
            merchant_id,
            merchant_name,
            tx.get("datetime"),
            tx.get("order_status", ""),
            float(total) if total else 0,
            price.get("currency", "USD"),
            payment_method,
            card_id,
            product_text,
            json.dumps(tx),
            payment_method,  # For the UPDATE clause
            card_id         # For the UPDATE clause
        ))
        
        if commit:
            conn.commit()
        return {"success": True, "id": tx_id, "payment_method": payment_method}
    
    def save_transactions_batch(self, transactions: List[Dict], user_id: str, merchant_id: int, merchant_name: str) -> Dict[str, Any]:
        """Save multiple transactions with a single commit"""
        saved = 0
        conn, cursor = self._get_connection()
        
        try:
            for tx in transactions:
                try:
                    self.save_transaction(tx, user_id, merchant_id, merchant_name, commit=False)
                    saved += 1
                except Exception as e:
                    print(f"Error saving transaction {tx.get('id')}: {e}")
                    # Continue with other transactions instead of failing completely
                    continue
            
            # Commit all changes at once
            conn.commit()
        except Exception as e:
            print(f"Error committing batch: {e}")
            # Rollback to release locks
            try:
                conn.rollback()
            except:
                pass
            raise e
            
        return {"success": True, "saved": saved, "total": len(transactions)}
    
    def get_transactions(self, user_id: str, merchant_id: Optional[int] = None, limit: int = 50, card_id: Optional[str] = None, card_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get transactions from Snowflake with fallback card_type filtering"""
        conn, cursor = self._get_connection()
        
        query = """
            SELECT id, external_id, merchant_id, merchant_name, datetime,
                   order_status, total_amount, currency, 
                   spend_category, category_confidence,
                   points_earned, payment_method, card_id, raw_json
            FROM TRANSACTIONS 
            WHERE user_id = %s
        """
        params = [user_id]
        
        if merchant_id:
            query += " AND merchant_id = %s"
            params.append(merchant_id)
        
        if (card_id and card_id not in ["null", "undefined", "paypal-static"]) or card_type:
            # Handle both strict card_id match AND brand fallback for unlinked transactions
            # This ensures transactions show for Visa/PayPal cards even before explicit linking
            target_type = card_type.upper() if card_type else "UNKNOWN"
            
            if card_id and card_id not in ["null", "undefined", "paypal-static"]:
                query += " AND (card_id = %s OR (card_id IS NULL AND (UPPER(payment_method) = %s OR UPPER(payment_method) LIKE %s)))"
                params.append(card_id)
                params.append(target_type)
                params.append(f"%{target_type}%")
            else:
                # No specific card_id (e.g. PayPal static card), match unlinked transactions by brand
                query += " AND card_id IS NULL AND (UPPER(payment_method) = %s OR UPPER(payment_method) LIKE %s)"
                params.append(target_type)
                params.append(f"%{target_type}%")
        # No else clause - when no filters specified, show ALL transactions
            
        query += " ORDER BY datetime DESC LIMIT %s"
        params.append(limit)
        
        cursor.execute(query, tuple(params))
        
        rows = cursor.fetchall()
        transactions = []
        for row in rows:
            raw_json_str = row[13]
            raw_data = json.loads(raw_json_str) if raw_json_str and isinstance(raw_json_str, str) else (raw_json_str if raw_json_str else {})
            
            transactions.append({
                "id": row[0],
                "external_id": row[1],
                "merchant_id": row[2],
                "merchant_name": row[3],
                "datetime": str(row[4]) if row[4] else None,
                "order_status": row[5],
                "total_amount": float(row[6]) if row[6] else 0,
                "currency": row[7],
                "category": row[8], # spend_category
                "category_confidence": float(row[9]) if row[9] else None,
                "points_earned": row[10] if row[10] is not None else 0,
                "payment_method": row[11],
                "card_id": row[12],
                "raw_json": raw_data
            })
        return transactions
    
    # ========== Vector Classification ==========
    
    def classify_transaction(self, tx_id: str) -> Dict[str, Any]:
        """Classify a single transaction using vector similarity"""
        conn, cursor = self._get_connection()
        
        cursor.execute("""
            WITH tx_embedding AS (
                SELECT 
                    id,
                    product_text,
                    SNOWFLAKE.CORTEX.EMBED_TEXT_768('snowflake-arctic-embed-m-v1.5', product_text) AS embedding
                FROM TRANSACTIONS
                WHERE id = %s AND product_text IS NOT NULL AND product_text != ''
            ),
            similarities AS (
                SELECT 
                    t.id,
                    c.category,
                    VECTOR_COSINE_SIMILARITY(t.embedding, c.embedding) AS similarity
                FROM tx_embedding t
                CROSS JOIN CATEGORY_EMBEDDINGS c
            ),
            best_match AS (
                SELECT id, category, similarity
                FROM similarities
                ORDER BY similarity DESC
                LIMIT 1
            )
            UPDATE TRANSACTIONS
            SET category = best_match.category,
                category_confidence = best_match.similarity
            FROM best_match
            WHERE TRANSACTIONS.id = best_match.id
            RETURNING TRANSACTIONS.id, TRANSACTIONS.category, TRANSACTIONS.category_confidence
        """, (tx_id,))
        
        result = cursor.fetchone()
        conn.commit()
        
        if result:
            return {"id": result[0], "category": result[1], "confidence": float(result[2])}
        return {"id": tx_id, "category": None, "error": "No product text to classify"}
    
    def classify_all_unclassified(self) -> Dict[str, Any]:
        """Classify all transactions that don't have a category"""
        conn, cursor = self._get_connection()
        
        cursor.execute("""
            UPDATE TRANSACTIONS t
            SET 
                category = matched.category,
                category_confidence = matched.similarity
            FROM (
                SELECT 
                    tx.id,
                    cat.category,
                    VECTOR_COSINE_SIMILARITY(
                        SNOWFLAKE.CORTEX.EMBED_TEXT_768('snowflake-arctic-embed-m-v1.5', tx.product_text),
                        cat.embedding
                    ) AS similarity,
                    ROW_NUMBER() OVER (PARTITION BY tx.id ORDER BY similarity DESC) AS rn
                FROM TRANSACTIONS tx
                CROSS JOIN CATEGORY_EMBEDDINGS cat
                WHERE tx.category IS NULL 
                  AND tx.product_text IS NOT NULL 
                  AND tx.product_text != ''
            ) matched
            WHERE t.id = matched.id AND matched.rn = 1
        """)
        
        count = cursor.rowcount
        conn.commit()
        return {"success": True, "classified": count}
    
    # ========== Cortex AI Categorization ==========
    
    def categorize_transaction_ai(self, tx_id: str) -> Dict[str, Any]:
        """Use Snowflake Cortex CLASSIFY_TEXT to categorize a transaction"""
        conn, cursor = self._get_connection()
        
        # Build category array for CLASSIFY_TEXT
        category_array = ", ".join([f"'{cat}'" for cat in SPEND_CATEGORIES])
        
        try:
            cursor.execute(f"""
                WITH classification AS (
                    SELECT 
                        id,
                        SNOWFLAKE.CORTEX.CLASSIFY_TEXT(
                            COALESCE(product_text, '') || ' ' || COALESCE(merchant_name, ''),
                            ARRAY_CONSTRUCT({category_array})
                        ) AS result
                    FROM TRANSACTIONS
                    WHERE id = %s
                )
                SELECT 
                    id,
                    result:label::VARCHAR AS category,
                    result:score::FLOAT AS confidence
                FROM classification
            """, (tx_id,))
            
            result = cursor.fetchone()
            if result:
                category = result[1]
                confidence = result[2]
                
                # Update the transaction
                cursor.execute("""
                    UPDATE TRANSACTIONS 
                    SET spend_category = %s, category_confidence = %s
                    WHERE id = %s
                """, (category, confidence, tx_id))
                conn.commit()
                
                return {"id": tx_id, "spend_category": category, "confidence": confidence}
        except Exception as e:
            print(f"CLASSIFY_TEXT error, falling back to vector: {e}")
            # Fallback to legacy vector classification
            return self.classify_transaction(tx_id)
        
        return {"id": tx_id, "spend_category": None, "error": "No text to classify"}
    
    def parse_benefits_with_ai(self, benefits_text: str) -> Dict[str, int]:
        """Use Cortex AI to parse natural language benefits into multipliers"""
        if not benefits_text or benefits_text.strip() == "":
            return {}
        
        conn, cursor = self._get_connection()
        
        try:
            # Use Cortex COMPLETE to extract multipliers from natural language
            prompt = f"""Extract point multipliers from this credit card benefits text.
Return ONLY a valid JSON object with category:multiplier pairs.
Valid categories: food_dining, groceries, gas_auto, shopping, travel, entertainment, healthcare, services, home
If a category is not mentioned, do not include it.
For "all purchases" or "everything" use "base" key.

Benefits text: {benefits_text}

Return JSON only, no explanation:"""
            
            cursor.execute("""
                SELECT SNOWFLAKE.CORTEX.COMPLETE(
                    'mistral-large2',
                    %s
                ) AS parsed
            """, (prompt,))
            
            result = cursor.fetchone()
            if result and result[0]:
                # Parse the JSON response
                import re
                response = result[0]
                # Extract JSON from response
                json_match = re.search(r'\{[^}]+\}', response)
                if json_match:
                    return json.loads(json_match.group())
        except Exception as e:
            print(f"Benefits parsing error: {e}")
        
        return {}
    
    def calculate_points(self, tx_id: str, card_id: str = None) -> Dict[str, Any]:
        """Calculate points earned for a transaction based on card benefits"""
        conn, cursor = self._get_connection()
        
        # Get transaction details
        cursor.execute("""
            SELECT id, spend_category, total_amount, payment_method, card_id
            FROM TRANSACTIONS WHERE id = %s
        """, (tx_id,))
        
        tx = cursor.fetchone()
        if not tx:
            return {"error": "Transaction not found"}
        
        tx_id, spend_category, amount, payment_method, tx_card_id = tx
        
        # PayPal = 0 points
        if payment_method and 'PAYPAL' in payment_method.upper():
            cursor.execute("UPDATE TRANSACTIONS SET points_earned = 0 WHERE id = %s", (tx_id,))
            conn.commit()
            return {"id": tx_id, "points_earned": 0, "reason": "PayPal payment"}
        
        # Get card benefits
        use_card_id = card_id or tx_card_id
        if not use_card_id:
            # Default 1x points
            points = int(amount) if amount else 0
            cursor.execute("UPDATE TRANSACTIONS SET points_earned = %s WHERE id = %s", (points, tx_id))
            conn.commit()
            return {"id": tx_id, "points_earned": points, "multiplier": 1}
        
        cursor.execute("SELECT benefits FROM CARDS WHERE card_id = %s", (use_card_id,))
        card = cursor.fetchone()
        benefits_text = card[0] if card and card[0] else ""
        
        # Parse benefits with AI
        multipliers = self.parse_benefits_with_ai(benefits_text)
        
        # Get multiplier for category
        multiplier = multipliers.get(spend_category, multipliers.get("base", 1))
        points = int(float(amount or 0) * multiplier)
        
        cursor.execute("UPDATE TRANSACTIONS SET points_earned = %s WHERE id = %s", (points, tx_id))
        conn.commit()
        
        return {"id": tx_id, "points_earned": points, "multiplier": multiplier, "category": spend_category}
    
    def process_all_uncategorized(self, user_id: str = None) -> Dict[str, Any]:
        """Categorize and calculate points for all uncategorized transactions"""
        conn, cursor = self._get_connection()
        
        # Get uncategorized transactions
        if user_id:
            cursor.execute("""
                SELECT id FROM TRANSACTIONS 
                WHERE spend_category IS NULL AND user_id = %s
            """, (user_id,))
        else:
            cursor.execute("SELECT id FROM TRANSACTIONS WHERE spend_category IS NULL")
        
        tx_ids = [row[0] for row in cursor.fetchall()]
        
        categorized = 0
        points_calculated = 0
        
        for tx_id in tx_ids:
            try:
                # Categorize
                result = self.categorize_transaction_ai(tx_id)
                if result.get("spend_category"):
                    categorized += 1
                    # Calculate points
                    points_result = self.calculate_points(tx_id)
                    if points_result.get("points_earned") is not None:
                        points_calculated += 1
            except Exception as e:
                print(f"Error processing {tx_id}: {e}")
        
        return {
            "success": True,
            "transactions_found": len(tx_ids),
            "categorized": categorized,
            "points_calculated": points_calculated
        }
    
    def backfill_payment_methods(self, user_id: str = None) -> Dict[str, Any]:
        """Backfill payment_method from raw_json for existing transactions"""
        conn, cursor = self._get_connection()
        
        # Update payment_method from raw_json where it's currently NULL
        cursor.execute("""
            UPDATE TRANSACTIONS
            SET payment_method = 
                CASE 
                    WHEN raw_json:payment_methods[0]:type::VARCHAR = 'PAYPAL' 
                         OR UPPER(raw_json:payment_methods[0]:brand::VARCHAR) = 'PAYPAL'
                    THEN 'PAYPAL'
                    ELSE COALESCE(
                        UPPER(raw_json:payment_methods[0]:brand::VARCHAR),
                        UPPER(raw_json:payment_methods[0]:type::VARCHAR),
                        'CARD'
                    )
                END
            WHERE payment_method IS NULL
              AND raw_json:payment_methods[0] IS NOT NULL
        """)
        
        updated = cursor.rowcount
        conn.commit()
        return {"success": True, "updated": updated}
    
    def recalculate_all_points(self, user_id: str = None) -> Dict[str, Any]:
        """Recalculate points for all transactions (respecting PayPal = 0)"""
        conn, cursor = self._get_connection()
        
        # First, set PayPal transactions to 0 points
        cursor.execute("""
            UPDATE TRANSACTIONS
            SET points_earned = 0
            WHERE payment_method = 'PAYPAL'
        """)
        paypal_zeroed = cursor.rowcount
        
        # For non-PayPal, use 1x base (simplified - full version would parse benefits)
        cursor.execute("""
            UPDATE TRANSACTIONS
            SET points_earned = FLOOR(total_amount)
            WHERE payment_method != 'PAYPAL' OR payment_method IS NULL
        """)
        calculated = cursor.rowcount
        
        conn.commit()
        return {
            "success": True,
            "paypal_zeroed": paypal_zeroed,
            "points_calculated": calculated
        }
    
    # ========== Cashflow Analytics ==========
    
    def get_cashflow(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """Get cashflow analytics by category"""
        conn, cursor = self._get_connection()
        
        cursor.execute("""
            SELECT 
                COALESCE(category, 'uncategorized') AS category,
                COUNT(*) AS transaction_count,
                SUM(total_amount) AS total_spent,
                AVG(total_amount) AS avg_transaction
            FROM TRANSACTIONS
            WHERE user_id = %s
              AND datetime >= DATEADD(day, -%s, CURRENT_TIMESTAMP())
            GROUP BY category
            ORDER BY total_spent DESC
        """, (user_id, days))
        
        rows = cursor.fetchall()
        categories = []
        total_spent = 0
        
        for row in rows:
            amount = float(row[2]) if row[2] else 0
            total_spent += amount
            categories.append({
                "category": row[0],
                "transaction_count": row[1],
                "total_spent": amount,
                "avg_transaction": float(row[3]) if row[3] else 0,
            })
        
        return {
            "user_id": user_id,
            "period_days": days,
            "total_spent": total_spent,
            "by_category": categories,
        }
    
    # ========== Merchant Operations ==========
    
    def save_merchant(self, merchant_id: int, user_id: str, name: str, logo_url: str = "") -> Dict[str, Any]:
        """Save or update a connected merchant"""
        conn, cursor = self._get_connection()
        
        cursor.execute("""
            MERGE INTO MERCHANTS AS target
            USING (SELECT %s AS merchant_id) AS source
            ON target.merchant_id = source.merchant_id AND target.user_id = %s
            WHEN MATCHED THEN
                UPDATE SET name = %s, logo_url = %s
            WHEN NOT MATCHED THEN
                INSERT (merchant_id, user_id, name, logo_url, top_of_file_payment)
                VALUES (%s, %s, %s, %s, 'paypal')
        """, (merchant_id, user_id, name, logo_url, merchant_id, user_id, name, logo_url))
        
        conn.commit()
        return {"success": True, "merchant_id": merchant_id}
    
    def get_merchants(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all connected merchants for a user"""
        conn, cursor = self._get_connection()
        
        cursor.execute("""
            SELECT merchant_id, name, logo_url, top_of_file_payment, 
                   connected_at, last_transaction_at
            FROM MERCHANTS
            WHERE user_id = %s
            ORDER BY last_transaction_at DESC NULLS LAST
        """, (user_id,))
        
        rows = cursor.fetchall()
        merchants = []
        for row in rows:
            merchants.append({
                "merchant_id": row[0],
                "name": row[1],
                "logo_url": row[2],
                "top_of_file_payment": row[3] or "paypal",
                "connected_at": str(row[4]) if row[4] else None,
                "last_transaction_at": str(row[5]) if row[5] else None,
            })
        return merchants
    
    def update_merchant_payment(self, merchant_id: int, user_id: str, payment_method: str) -> Dict[str, Any]:
        """Update the top-of-file payment method for a merchant"""
        conn, cursor = self._get_connection()
        
        cursor.execute("""
            UPDATE MERCHANTS
            SET top_of_file_payment = %s, last_transaction_at = CURRENT_TIMESTAMP()
            WHERE merchant_id = %s AND user_id = %s
        """, (payment_method, merchant_id, user_id))
        
        conn.commit()
        return {"success": True, "merchant_id": merchant_id, "payment_method": payment_method}
    
    def save_transaction_with_payment_update(self, tx: Dict[str, Any], user_id: str, merchant_id: int, merchant_name: str, payment_method: str = None) -> Dict[str, Any]:
        """Save a transaction and update merchant's top-of-file payment if provided"""
        # First save the transaction
        result = self.save_transaction(tx, user_id, merchant_id, merchant_name)
        
        # Update merchant's last transaction time and payment method if specified
        if payment_method:
            self.update_merchant_payment(merchant_id, user_id, payment_method)
        else:
            # Just update the last transaction time
            conn, cursor = self._get_connection()
            cursor.execute("""
                UPDATE MERCHANTS
                SET last_transaction_at = CURRENT_TIMESTAMP()
                WHERE merchant_id = %s AND user_id = %s
            """, (merchant_id, user_id))
            conn.commit()
        
        return result
    
    def complete(self, prompt: str, model: str = "llama3.1-70b") -> str:
        """Call Snowflake Cortex COMPLETE to generate a response"""
        conn, cursor = self._get_connection()
        
        # Escape single quotes in prompt for SQL
        escaped_prompt = prompt.replace("'", "''")
        
        try:
            cursor.execute(f"SELECT SNOWFLAKE.CORTEX.COMPLETE(%s, %s)", (model, prompt))
            result = cursor.fetchone()
            if result:
                return result[0]
            return "No response generated."
        except Exception as e:
            raise Exception(f"Cortex COMPLETE failed: {e}")

    def delete_merchant(self, merchant_id: int, user_id: str) -> Dict[str, Any]:
        """Delete a connected merchant"""
        conn, cursor = self._get_connection()
        
        cursor.execute("""
            DELETE FROM MERCHANTS
            WHERE merchant_id = %s AND user_id = %s
        """, (merchant_id, user_id))
        
        conn.commit()
        return {"success": True, "deleted": cursor.rowcount > 0}


# Singleton instance
_db_instance = None

def get_db() -> SnowflakeDB:
    """Get the singleton database instance"""
    global _db_instance
    if _db_instance is None:
        _db_instance = SnowflakeDB()
    return _db_instance

