import sqlite3
import os
from pathlib import Path
from backend.config import Config

def init_db():
    os.makedirs(Config.LOCAL_STATE_DIR, exist_ok=True)
    db_path = os.path.join(Config.LOCAL_STATE_DIR, "state.db")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            type TEXT NOT NULL,
            src_path TEXT,
            dst_path TEXT,
            status TEXT NOT NULL,
            error TEXT
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS review_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id TEXT NOT NULL,
            backup_path TEXT,
            kept_path TEXT,
            reviewed INTEGER DEFAULT 0,
            action TEXT,
            created_at TEXT NOT NULL
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cache_metadata (
            path TEXT PRIMARY KEY,
            mtime REAL,
            size INTEGER,
            hash_key TEXT,
            cached_at TEXT NOT NULL
        )
    """)
    
    conn.commit()
    conn.close()
    
    return db_path

