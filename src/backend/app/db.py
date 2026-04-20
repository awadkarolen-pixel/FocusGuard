import sqlite3

DB_NAME = "focusguard.db"


def init_db():
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            start_time REAL,
            end_time REAL,
            focused_time REAL,
            away_time REAL,
            alerts_count INTEGER
        )
    """)

    conn.commit()
    conn.close()


def save_session(start_time, end_time, focused_time, away_time, alerts_count):
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO sessions (start_time, end_time, focused_time, away_time, alerts_count)
        VALUES (?, ?, ?, ?, ?)
    """, (start_time, end_time, focused_time, away_time, alerts_count))

    conn.commit()
    conn.close()


def get_all_sessions():
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()

    cur.execute("""
        SELECT id, start_time, end_time, focused_time, away_time, alerts_count
        FROM sessions
        ORDER BY id DESC
    """)

    rows = cur.fetchall()
    conn.close()

    sessions = []
    for row in rows:
        session_id, start_time, end_time, focused_time, away_time, alerts_count = row
        total_time = focused_time + away_time
        focus_percentage = round((focused_time / total_time) * 100, 1) if total_time > 0 else 0

        sessions.append({
            "id": session_id,
            "start_time": start_time,
            "end_time": end_time,
            "focused_time": round(focused_time, 1),
            "away_time": round(away_time, 1),
            "alerts_count": alerts_count,
            "focus_percentage": focus_percentage
        })

    return sessions