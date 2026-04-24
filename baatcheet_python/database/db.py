import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "baatcheet.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            phone       TEXT UNIQUE NOT NULL,
            name        TEXT,
            language    TEXT DEFAULT 'hinglish',
            created_at  TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS messages (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            role        TEXT NOT NULL,
            content     TEXT NOT NULL,
            provider    TEXT,
            created_at  TEXT DEFAULT (datetime('now')),
            FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS sessions (
            id          TEXT PRIMARY KEY,
            user_id     INTEGER NOT NULL,
            user_phone  TEXT NOT NULL,
            tier        TEXT NOT NULL,
            reason      TEXT,
            summary     TEXT,
            price       INTEGER,
            status      TEXT DEFAULT 'pending',
            listener_id TEXT,
            created_at  TEXT DEFAULT (datetime('now')),
            updated_at  TEXT DEFAULT (datetime('now')),
            FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS ratings (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id  TEXT NOT NULL,
            rating      INTEGER NOT NULL,
            feedback    TEXT,
            created_at  TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS listeners (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            tier        TEXT NOT NULL,
            phone       TEXT,
            is_active   INTEGER DEFAULT 1,
            sessions_done INTEGER DEFAULT 0,
            rating_avg  REAL DEFAULT 0.0,
            created_at  TEXT DEFAULT (datetime('now'))
        );
    """)
    conn.commit()
    conn.close()
    print("[DB] Initialized")


def get_or_create_user(phone: str) -> dict:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE phone = ?", (phone,))
    user = c.fetchone()
    if not user:
        c.execute("INSERT INTO users (phone) VALUES (?)", (phone,))
        conn.commit()
        c.execute("SELECT * FROM users WHERE phone = ?", (phone,))
        user = c.fetchone()
    conn.close()
    return dict(user)


def save_message(user_id: int, role: str, content: str, provider: str = None):
    conn = get_connection()
    conn.execute(
        "INSERT INTO messages (user_id, role, content, provider) VALUES (?, ?, ?, ?)",
        (user_id, role, content, provider)
    )
    conn.commit()
    conn.close()


def get_conversation_history(user_id: int, limit: int = 14) -> list:
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "SELECT role, content FROM messages WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
        (user_id, limit)
    )
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in reversed(rows)]


def save_session(user_id, user_phone, tier, reason, summary, price):
    import uuid
    session_id = str(uuid.uuid4())[:8].upper()
    conn = get_connection()
    conn.execute(
        """INSERT INTO sessions (id, user_id, user_phone, tier, reason, summary, price)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (session_id, user_id, user_phone, tier, reason, summary, price)
    )
    conn.commit()
    conn.close()
    return session_id


def get_all_sessions(tier=None, status=None) -> list:
    conn = get_connection()
    c = conn.cursor()
    query = "SELECT * FROM sessions WHERE 1=1"
    params = []
    if tier:
        query += " AND tier = ?"
        params.append(tier)
    if status and status != "all":
        query += " AND status = ?"
        params.append(status)
    query += " ORDER BY created_at DESC"
    c.execute(query, params)
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_session_status(session_id: str, status: str, listener_id: str = None):
    conn = get_connection()
    if listener_id:
        conn.execute(
            "UPDATE sessions SET status=?, listener_id=?, updated_at=datetime('now') WHERE id=?",
            (status, listener_id, session_id)
        )
    else:
        conn.execute(
            "UPDATE sessions SET status=?, updated_at=datetime('now') WHERE id=?",
            (status, session_id)
        )
    conn.commit()
    conn.close()


def save_rating(session_id: str, rating: int, feedback: str = ""):
    conn = get_connection()
    conn.execute(
        "INSERT INTO ratings (session_id, rating, feedback) VALUES (?, ?, ?)",
        (session_id, rating, feedback)
    )
    conn.commit()
    conn.close()


def get_stats() -> dict:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM users")
    total_users = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM messages")
    total_messages = c.fetchone()[0]
    c.execute("SELECT tier, status, COUNT(*) as cnt FROM sessions GROUP BY tier, status")
    session_rows = c.fetchall()
    conn.close()

    sessions = {}
    for row in session_rows:
        key = f"{row['tier']}_{row['status']}"
        sessions[key] = row['cnt']

    return {
        "total_users": total_users,
        "total_messages": total_messages,
        "sessions": sessions
    }
