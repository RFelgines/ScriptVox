import sqlite3

try:
    conn = sqlite3.connect('data/scriptvox.db')
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE chapter ADD COLUMN progress INTEGER DEFAULT 0")
        conn.commit()
        print("Column 'progress' added successfully.")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e):
            print("Column 'progress' already exists.")
        else:
            print(f"Error adding column: {e}")
    finally:
        conn.close()
except Exception as e:
    print(f"Database connection error: {e}")
