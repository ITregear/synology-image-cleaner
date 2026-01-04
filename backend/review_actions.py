import os
import sqlite3
from datetime import datetime
from typing import Optional, Tuple, Dict
import logging
from backend.config import Config
from backend.recycle_bin import detect_recycle_bin, move_to_recycle_bin, restore_from_recycle_bin

logger = logging.getLogger(__name__)

def ignore_duplicate(review_id: int, backup_path: str, sorted_path: str) -> Tuple[bool, Optional[str]]:
    """
    Mark a duplicate pair as ignored. This persists across sessions.
    """
    db_path = os.path.join(Config.LOCAL_STATE_DIR, "state.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Mark as reviewed with action 'ignored'
        cursor.execute("""
            UPDATE review_queue 
            SET reviewed = 1, action = 'ignored'
            WHERE id = ?
        """, (review_id,))
        
        # Add to ignored_pairs table for persistence
        cursor.execute("""
            INSERT OR IGNORE INTO ignored_pairs (backup_path, sorted_path, ignored_at)
            VALUES (?, ?, ?)
        """, (backup_path, sorted_path, datetime.now().isoformat()))
        
        conn.commit()
        logger.info(f"Ignored duplicate: {backup_path}")
        return True, None
        
    except Exception as e:
        conn.rollback()
        logger.exception(f"Error ignoring duplicate: {e}")
        return False, str(e)
    finally:
        conn.close()

def delete_duplicate(review_id: int, backup_path: str, session_id: str) -> Tuple[bool, Optional[str], Optional[Dict]]:
    """
    Delete a duplicate by moving it to the recycle bin.
    Returns (success, error_message, undo_info)
    """
    db_path = os.path.join(Config.LOCAL_STATE_DIR, "state.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Detect recycle bin for the backup folder
        backup_root = '/' + '/'.join(backup_path.split('/')[:3])  # Get /volume1/share
        recycle_bin = detect_recycle_bin(backup_root)
        
        if not recycle_bin:
            return False, "Recycle bin not found. Cannot safely delete.", None
        
        # Move file to recycle bin
        success, recycle_location, error = move_to_recycle_bin(backup_path, recycle_bin)
        
        if not success:
            return False, error, None
        
        # Update review queue
        cursor.execute("""
            UPDATE review_queue 
            SET reviewed = 1, action = 'deleted'
            WHERE id = ?
        """, (review_id,))
        
        # Add to undo stack
        cursor.execute("""
            INSERT INTO undo_stack 
            (session_id, review_id, previous_action, previous_reviewed, backup_path, original_location, recycle_location, timestamp)
            VALUES (?, ?, NULL, 0, ?, ?, ?, ?)
        """, (session_id, review_id, backup_path, backup_path, recycle_location, datetime.now().isoformat()))
        
        undo_id = cursor.lastrowid
        
        conn.commit()
        
        logger.info(f"Deleted duplicate: {backup_path} -> {recycle_location}")
        
        return True, None, {
            'undo_id': undo_id,
            'review_id': review_id,
            'backup_path': backup_path,
            'recycle_location': recycle_location
        }
        
    except Exception as e:
        conn.rollback()
        logger.exception(f"Error deleting duplicate: {e}")
        return False, str(e), None
    finally:
        conn.close()

def undo_last_action(session_id: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Undo the last action in the current session.
    Returns (success, error_message, action_type)
    """
    db_path = os.path.join(Config.LOCAL_STATE_DIR, "state.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Get the most recent undo entry for this session
        cursor.execute("""
            SELECT id, review_id, previous_action, previous_reviewed, backup_path, original_location, recycle_location
            FROM undo_stack
            WHERE session_id = ?
            ORDER BY timestamp DESC
            LIMIT 1
        """, (session_id,))
        
        row = cursor.fetchone()
        if not row:
            return False, "Nothing to undo", None
        
        undo_id, review_id, prev_action, prev_reviewed, backup_path, original_location, recycle_location = row
        
        # Restore file from recycle bin
        if recycle_location:
            success, error = restore_from_recycle_bin(recycle_location, original_location)
            if not success:
                return False, f"Failed to restore file: {error}", None
        
        # Restore review queue state
        cursor.execute("""
            UPDATE review_queue
            SET reviewed = ?, action = ?
            WHERE id = ?
        """, (prev_reviewed, prev_action, review_id))
        
        # Remove from undo stack
        cursor.execute("DELETE FROM undo_stack WHERE id = ?", (undo_id,))
        
        conn.commit()
        
        logger.info(f"Undid action for review_id {review_id}")
        return True, None, "delete"
        
    except Exception as e:
        conn.rollback()
        logger.exception(f"Error undoing action: {e}")
        return False, str(e), None
    finally:
        conn.close()

def get_review_stats(scan_session_id: str) -> Dict:
    """
    Get statistics for a review session.
    """
    db_path = os.path.join(Config.LOCAL_STATE_DIR, "state.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Total pairs
        cursor.execute("""
            SELECT COUNT(*) FROM review_queue
            WHERE scan_session_id = ?
        """, (scan_session_id,))
        total = cursor.fetchone()[0]
        
        # Reviewed pairs
        cursor.execute("""
            SELECT COUNT(*) FROM review_queue
            WHERE scan_session_id = ? AND reviewed = 1
        """, (scan_session_id,))
        reviewed = cursor.fetchone()[0]
        
        # Deleted pairs
        cursor.execute("""
            SELECT COUNT(*) FROM review_queue
            WHERE scan_session_id = ? AND action = 'deleted'
        """, (scan_session_id,))
        deleted = cursor.fetchone()[0]
        
        # Ignored pairs
        cursor.execute("""
            SELECT COUNT(*) FROM review_queue
            WHERE scan_session_id = ? AND action = 'ignored'
        """, (scan_session_id,))
        ignored = cursor.fetchone()[0]
        
        return {
            'total': total,
            'reviewed': reviewed,
            'remaining': total - reviewed,
            'deleted': deleted,
            'ignored': ignored,
            'completed': reviewed == total
        }
        
    finally:
        conn.close()

