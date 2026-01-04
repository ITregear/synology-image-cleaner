import os
import sqlite3
import uuid
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

def save_duplicates_to_db(duplicate_pairs: List[Dict], backup_path: str = '', sorted_path: str = '', scan_session_id: Optional[str] = None) -> str:
    """
    Save duplicate pairs to the database.
    Checks against ignored_pairs table and automatically marks previously ignored pairs.
    Returns the scan_session_id.
    """
    db_path = os.path.join(Config.LOCAL_STATE_DIR, "state.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Get all previously ignored pairs
        cursor.execute("""
            SELECT backup_path, sorted_path FROM ignored_pairs
        """)
        ignored_set = set((row[0], row[1]) for row in cursor.fetchall())
        logger.info(f"Found {len(ignored_set)} previously ignored pairs")
        
        # Create a new scan session
        if not scan_session_id:
            scan_session_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        # Count pairs that are NOT already ignored
        new_pair_count = sum(1 for pair in duplicate_pairs 
                            if (pair['backup_path'], pair['sorted_path']) not in ignored_set)
        
        # Extract root paths from params or first pair
        backup_root = backup_path
        sorted_root = sorted_path
        if not backup_root and duplicate_pairs:
            backup_root = os.path.dirname(duplicate_pairs[0]['backup_path'])
        if not sorted_root and duplicate_pairs:
            sorted_root = os.path.dirname(duplicate_pairs[0]['sorted_path'])
        
        cursor.execute("""
            INSERT INTO scan_sessions (id, backup_path, sorted_path, created_at, pair_count)
            VALUES (?, ?, ?, ?, ?)
        """, (scan_session_id, backup_root, sorted_root, timestamp, new_pair_count))
        
        # Insert all duplicate pairs into review_queue
        # Mark as ignored if they were previously ignored
        for pair in duplicate_pairs:
            is_ignored = (pair['backup_path'], pair['sorted_path']) in ignored_set
            
            cursor.execute("""
                INSERT INTO review_queue (
                    group_id, backup_path, kept_path, reviewed, action, scan_session_id, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                pair['group_id'],
                pair['backup_path'],
                pair['sorted_path'],
                1 if is_ignored else 0,  # Mark as reviewed if ignored
                'ignored' if is_ignored else None,  # Set action to 'ignored'
                scan_session_id,
                timestamp
            ))
        
        conn.commit()
        logger.info(f"Saved {len(duplicate_pairs)} duplicate pairs to database for session {scan_session_id}")
        logger.info(f"{new_pair_count} new pairs, {len(duplicate_pairs) - new_pair_count} previously ignored")
        return scan_session_id
        
    except Exception as e:
        logger.error(f"Error saving duplicates to database: {e}")
        conn.rollback()
        return ""
    finally:
        conn.close()

def get_duplicates_from_db(scan_session_id: Optional[str] = None, limit: Optional[int] = None, offset: int = 0, include_reviewed: bool = False) -> List[Dict]:
    """
    Retrieve duplicate pairs from the database.
    If scan_session_id is None, returns pairs from the most recent session.
    By default, excludes reviewed/ignored/deleted pairs (include_reviewed=False).
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
        # By default, exclude reviewed items (ignored or deleted)
        query = """
            SELECT id, backup_path, kept_path, reviewed, action
            FROM review_queue
            WHERE scan_session_id = ?
        """
        
        if not include_reviewed:
            # Exclude pairs that have been reviewed (ignored or deleted)
            query += " AND (reviewed = 0 OR reviewed IS NULL)"
        
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

