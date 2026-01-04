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
            scan_session_id TEXT,
            created_at TEXT NOT NULL
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scan_sessions (
            id TEXT PRIMARY KEY,
            backup_path TEXT NOT NULL,
            sorted_path TEXT NOT NULL,
            created_at TEXT NOT NULL,
            pair_count INTEGER DEFAULT 0
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
    
    # Create undo stack table for session-based undo
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS undo_stack (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            review_id INTEGER NOT NULL,
            previous_action TEXT,
            previous_reviewed INTEGER,
            backup_path TEXT NOT NULL,
            original_location TEXT,
            recycle_location TEXT,
            timestamp TEXT NOT NULL
        )
    """)
    
    # Create ignored pairs table for persistent ignore
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ignored_pairs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            backup_path TEXT NOT NULL,
            sorted_path TEXT NOT NULL,
            ignored_at TEXT NOT NULL,
            UNIQUE(backup_path, sorted_path)
        )
    """)
    
    conn.commit()
    conn.close()
    
    return db_path

