import sqlite3
from app.db import DB_PATH

print("DB path:", DB_PATH)

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

rows = cur.execute("SELECT * FROM sessions").fetchall()

print("Sessions in DB:", len(rows))
for row in rows:
    print(row)

conn.close()
