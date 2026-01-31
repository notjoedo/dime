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

# Transaction categories for classification
CATEGORIES = [
    ("groceries", "Grocery store food shopping supermarket produce vegetables fruits meat dairy"),
    ("dining", "Restaurant food delivery takeout cafe coffee shop bar dining eating out"),
    ("travel", "Airline hotel flight booking vacation trip travel transportation"),
    ("gas", "Gas station fuel petrol gasoline car vehicle automotive"),
    ("streaming", "Netflix Hulu Disney streaming subscription entertainment video music"),
    ("shopping", "Amazon retail online shopping ecommerce clothes electronics"),
    ("utilities", "Electric water gas bill utility payment internet phone"),
    ("healthcare", "Pharmacy doctor hospital medical prescription health insurance"),
    ("entertainment", "Movies concerts events tickets games sports recreation"),
    ("other", "Miscellaneous general purchase other"),
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
                product_text VARCHAR,
                raw_json VARIANT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
            )
        """)
        
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
    
    def save_transaction(self, tx: Dict[str, Any], user_id: str, merchant_id: int, merchant_name: str) -> Dict[str, Any]:
        """Save a transaction to Snowflake"""
        conn, cursor = self._get_connection()
        
        tx_id = tx.get("id", "")
        products = tx.get("products", [])
        product_text = " ".join([p.get("name", "") for p in products[:10]])  # First 10 products
        
        price = tx.get("price", {})
        total = price.get("total", "0")
        
        cursor.execute("""
            MERGE INTO TRANSACTIONS AS target
            USING (SELECT %s AS id) AS source
            ON target.id = source.id
            WHEN NOT MATCHED THEN
                INSERT (id, external_id, user_id, merchant_id, merchant_name,
                        datetime, order_status, total_amount, currency, product_text, raw_json)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, PARSE_JSON(%s))
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
            product_text,
            json.dumps(tx),
        ))
        
        conn.commit()
        return {"success": True, "id": tx_id}
    
    def save_transactions_batch(self, transactions: List[Dict], user_id: str, merchant_id: int, merchant_name: str) -> Dict[str, Any]:
        """Save multiple transactions"""
        saved = 0
        for tx in transactions:
            try:
                self.save_transaction(tx, user_id, merchant_id, merchant_name)
                saved += 1
            except Exception as e:
                print(f"Error saving transaction {tx.get('id')}: {e}")
        return {"success": True, "saved": saved, "total": len(transactions)}
    
    def get_transactions(self, user_id: str, merchant_id: Optional[int] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Get transactions from Snowflake"""
        conn, cursor = self._get_connection()
        
        if merchant_id:
            cursor.execute("""
                SELECT id, external_id, merchant_id, merchant_name, datetime,
                       order_status, total_amount, currency, category, category_confidence
                FROM TRANSACTIONS 
                WHERE user_id = %s AND merchant_id = %s
                ORDER BY datetime DESC
                LIMIT %s
            """, (user_id, merchant_id, limit))
        else:
            cursor.execute("""
                SELECT id, external_id, merchant_id, merchant_name, datetime,
                       order_status, total_amount, currency, category, category_confidence
                FROM TRANSACTIONS 
                WHERE user_id = %s
                ORDER BY datetime DESC
                LIMIT %s
            """, (user_id, limit))
        
        rows = cursor.fetchall()
        transactions = []
        for row in rows:
            transactions.append({
                "id": row[0],
                "external_id": row[1],
                "merchant_id": row[2],
                "merchant_name": row[3],
                "datetime": str(row[4]) if row[4] else None,
                "order_status": row[5],
                "total_amount": float(row[6]) if row[6] else 0,
                "currency": row[7],
                "category": row[8],
                "category_confidence": float(row[9]) if row[9] else None,
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

