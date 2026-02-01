from snowflake_db import get_db

def inspect_db():
    db = get_db()
    if not db:
        print("❌ Could not connect to Snowflake")
        return

    conn, cursor = db._get_connection()
    try:
        # Check MERCHANTS
        cursor.execute("SELECT COUNT(*) FROM MERCHANTS")
        m_count = cursor.fetchone()[0]
        print(f"MERCHANTS Count: {m_count}")
        
        if m_count > 0:
            cursor.execute("SELECT * FROM MERCHANTS LIMIT 5")
            cols = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            print(f"Columns: {cols}")
            for row in rows:
                print(row)
        else:
            print("⚠️ MERCHANTS table is empty!")
            
        # Check TRANSACTIONS
        cursor.execute("SELECT COUNT(*) FROM TRANSACTIONS")
        t_count = cursor.fetchone()[0]
        print(f"TRANSACTIONS Count: {t_count}")

    except Exception as e:
        print(f"❌ Error querying DB: {e}")

if __name__ == "__main__":
    inspect_db()
