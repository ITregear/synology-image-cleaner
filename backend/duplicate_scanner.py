import os
import sqlite3
from typing import List, Dict, Optional, Set
from datetime import datetime
from backend.ssh_client import SSHClient
from backend.config import Config
from backend.path_utils import is_subpath
import logging

logger = logging.getLogger(__name__)

# Common image file extensions
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp', '.heic', '.heif', '.raw', '.cr2', '.nef', '.orf', '.sr2'}

def is_image_file(filename: str) -> bool:
    """Check if a file has an image extension."""
    ext = os.path.splitext(filename.lower())[1]
    return ext in IMAGE_EXTENSIONS

def scan_folder_for_images(folder_path: str, exclude_path: Optional[str] = None) -> Dict[str, List[str]]:
    """
    Scan a folder recursively for image files via SSH.
    Returns a dictionary mapping filename -> list of full paths with that filename.
    
    Args:
        folder_path: Path to scan
        exclude_path: Optional path to exclude (if folder_path is a subfolder of exclude_path)
    """
    if not SSHClient.is_connected():
        logger.error("SSH not connected. Cannot scan folder.")
        return {}
    
    # Build find command with exclusion if needed
    if exclude_path and is_subpath(folder_path, exclude_path):
        # If folder_path is a subfolder of exclude_path, we shouldn't scan it
        logger.warning(f"Skipping scan of {folder_path} as it is a subfolder of {exclude_path}")
        return {}
    
    # Use find command to recursively list all files, then filter for images
    # Exclude Synology system folders (starting with @) and handle subpath exclusion
    # -path "*/@*" -prune excludes any directory starting with @
    command = f'find "{folder_path}" -path "*/@*" -prune -o -type f -print 2>/dev/null'
    
    success, output, error = SSHClient.run_command(command)
    
    if not success:
        logger.error(f"Failed to scan folder {folder_path}: {error}")
        return {}
    
    # Group files by filename (case-insensitive)
    files_by_name: Dict[str, List[str]] = {}
    skipped_count = 0
    total_files = 0
    
    for line in output.strip().split('\n'):
        if not line.strip():
            continue
        
        file_path = line.strip()
        total_files += 1
        
        # Additional check: skip if path contains /@
        if '/@' in file_path:
            skipped_count += 1
            logger.debug(f"Skipping system folder file: {file_path}")
            continue
        
        # Exclude files that are under exclude_path
        if exclude_path and is_subpath(file_path, exclude_path):
            skipped_count += 1
            logger.debug(f"Skipping excluded path file: {file_path}")
            continue
        
        filename = os.path.basename(file_path)
        
        if is_image_file(filename):
            # Use lowercase filename as key for case-insensitive matching
            key = filename.lower()
            if key not in files_by_name:
                files_by_name[key] = []
            files_by_name[key].append(file_path)
    
    logger.info(f"Scanned {folder_path}: found {len(files_by_name)} unique image filenames ({total_files} total files, {skipped_count} skipped)")
    return files_by_name

def find_duplicates(backup_path: str, sorted_path: str) -> List[Dict]:
    """
    Find duplicate image files between backup and sorted folders.
    Returns a list of duplicate pairs.
    
    If backup_path is a subfolder of sorted_path, it will be excluded from sorted scan.
    """
    logger.info(f"Starting duplicate scan: backup={backup_path}, sorted={sorted_path}")
    
    # Check if backup is subfolder of sorted - if so, exclude it from sorted scan
    exclude_from_sorted = None
    if is_subpath(backup_path, sorted_path):
        logger.info(f"Backup path is a subfolder of sorted path. Excluding backup from sorted scan.")
        exclude_from_sorted = backup_path
    
    # Scan both folders
    backup_files = scan_folder_for_images(backup_path)
    sorted_files = scan_folder_for_images(sorted_path, exclude_path=exclude_from_sorted)
    
    # Find filenames that exist in both folders
    duplicate_pairs = []
    
    for filename_lower, backup_paths in backup_files.items():
        if filename_lower in sorted_files:
            sorted_paths = sorted_files[filename_lower]
            
            # For each backup file with this name, pair it with sorted files
            # Typically we'll have one backup and one sorted, but handle multiple
            for backup_file in backup_paths:
                for sorted_file in sorted_paths:
                    duplicate_pairs.append({
                        'backup_path': backup_file,
                        'sorted_path': sorted_file,
                        'filename': os.path.basename(backup_file)
                    })
    
    logger.info(f"Found {len(duplicate_pairs)} duplicate pairs")
    return duplicate_pairs

def save_duplicates_to_db(duplicate_pairs: List[Dict], scan_session_id: Optional[str] = None) -> int:
    """
    Save duplicate pairs to the database.
    Returns the number of pairs saved.
    """
    db_path = os.path.join(Config.LOCAL_STATE_DIR, "state.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Create scan_sessions table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS scan_sessions (
                id TEXT PRIMARY KEY,
                backup_path TEXT NOT NULL,
                sorted_path TEXT NOT NULL,
                created_at TEXT NOT NULL,
                pair_count INTEGER DEFAULT 0
            )
        """)
        
        # Update review_queue table structure if needed (add scan_session_id)
        try:
            cursor.execute("ALTER TABLE review_queue ADD COLUMN scan_session_id TEXT")
        except sqlite3.OperationalError:
            pass  # Column already exists
        
        # If no session ID provided, create one
        if not scan_session_id:
            scan_session_id = datetime.now().isoformat()
        
        # Clear old pairs for this session (if re-running)
        cursor.execute("DELETE FROM review_queue WHERE scan_session_id = ?", (scan_session_id,))
        
        # Insert new pairs
        created_at = datetime.now().isoformat()
        for pair in duplicate_pairs:
            cursor.execute("""
                INSERT INTO review_queue 
                (group_id, backup_path, kept_path, reviewed, scan_session_id, created_at)
                VALUES (?, ?, ?, 0, ?, ?)
            """, (
                f"pair_{hash(pair['backup_path'])}",
                pair['backup_path'],
                pair['sorted_path'],
                scan_session_id,
                created_at
            ))
        
        # Update or insert scan session
        # Extract root paths from first pair if available
        backup_root = ''
        sorted_root = ''
        if duplicate_pairs:
            # Get directory of first file
            backup_root = os.path.dirname(duplicate_pairs[0]['backup_path'])
            sorted_root = os.path.dirname(duplicate_pairs[0]['sorted_path'])
        
        cursor.execute("""
            INSERT OR REPLACE INTO scan_sessions 
            (id, backup_path, sorted_path, created_at, pair_count)
            VALUES (?, ?, ?, ?, ?)
        """, (
            scan_session_id,
            backup_root,
            sorted_root,
            created_at,
            len(duplicate_pairs)
        ))
        
        conn.commit()
        logger.info(f"Saved {len(duplicate_pairs)} duplicate pairs to database (session: {scan_session_id})")
        return scan_session_id
        
    except Exception as e:
        logger.error(f"Error saving duplicates to database: {e}")
        conn.rollback()
        return 0
    finally:
        conn.close()

def get_duplicates_from_db(scan_session_id: Optional[str] = None, limit: Optional[int] = None, offset: int = 0, include_reviewed: bool = True) -> List[Dict]:
    """
    Retrieve duplicate pairs from the database.
    If scan_session_id is None, returns pairs from the most recent session.
    If include_reviewed is False, only returns unreviewed pairs.
    """
    db_path = os.path.join(Config.LOCAL_STATE_DIR, "state.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # If no session ID, get the most recent one
        if not scan_session_id:
            cursor.execute("""
                SELECT id FROM scan_sessions 
                ORDER BY created_at DESC 
                LIMIT 1
            """)
            result = cursor.fetchone()
            if result:
                scan_session_id = result[0]
            else:
                return []
        
        # Get pairs for this session
        query = """
            SELECT id, backup_path, kept_path, reviewed, action
            FROM review_queue
            WHERE scan_session_id = ?
        """
        
        if not include_reviewed:
            query += " AND reviewed = 0"
        
        query += " ORDER BY id"
        
        if limit:
            query += f" LIMIT {limit} OFFSET {offset}"
        
        cursor.execute(query, (scan_session_id,))
        rows = cursor.fetchall()
        
        pairs = []
        for row in rows:
            pairs.append({
                'id': row[0],
                'backup_path': row[1],
                'sorted_path': row[2],
                'reviewed': bool(row[3]),
                'action': row[4]
            })
        
        return pairs
        
    except Exception as e:
        logger.error(f"Error retrieving duplicates from database: {e}")
        return []
    finally:
        conn.close()

def get_scan_sessions() -> List[Dict]:
    """Get all scan sessions from the database."""
    db_path = os.path.join(Config.LOCAL_STATE_DIR, "state.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT id, backup_path, sorted_path, created_at, pair_count
            FROM scan_sessions
            ORDER BY created_at DESC
        """)
        rows = cursor.fetchall()
        
        sessions = []
        for row in rows:
            sessions.append({
                'id': row[0],
                'backup_path': row[1],
                'sorted_path': row[2],
                'created_at': row[3],
                'pair_count': row[4]
            })
        
        return sessions
        
    except Exception as e:
        logger.error(f"Error retrieving scan sessions: {e}")
        return []
    finally:
        conn.close()

