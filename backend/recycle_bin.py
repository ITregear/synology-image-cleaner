import os
import logging
from typing import Optional, Tuple
from backend.ssh_client import SSHClient

logger = logging.getLogger(__name__)

def detect_recycle_bin(share_root: str) -> Optional[str]:
    """
    Detect the recycle bin folder for a given share root.
    Tries common Synology recycle bin names.
    """
    if not SSHClient.is_connected():
        logger.error("SSH not connected")
        return None
    
    # Common recycle bin folder names on Synology
    candidates = ['#recycle', '@Recycle', '@recycle', '.recycle']
    
    for candidate in candidates:
        recycle_path = os.path.join(share_root, candidate)
        # Check if directory exists
        success, output, _ = SSHClient.run_command(f'test -d "{recycle_path}" && echo "exists"')
        if success and output and 'exists' in output:
            logger.info(f"Found recycle bin: {recycle_path}")
            return recycle_path
    
    logger.warning(f"No recycle bin found for {share_root}")
    return None

def move_to_recycle_bin(file_path: str, recycle_bin_path: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Move a file to the recycle bin, preserving the directory structure.
    Returns (success, new_location, error_message)
    """
    if not SSHClient.is_connected():
        return False, None, "SSH not connected"
    
    try:
        # Get the relative path from the share root
        # We need to preserve directory structure in recycle bin
        file_dir = os.path.dirname(file_path)
        file_name = os.path.basename(file_path)
        
        # Create corresponding directory in recycle bin
        recycle_dir = os.path.join(recycle_bin_path, os.path.basename(file_dir))
        
        # Create directory if it doesn't exist
        mkdir_cmd = f'mkdir -p "{recycle_dir}"'
        success, _, error = SSHClient.run_command(mkdir_cmd)
        if not success:
            return False, None, f"Failed to create recycle directory: {error}"
        
        # Move file to recycle bin
        new_location = os.path.join(recycle_dir, file_name)
        mv_cmd = f'mv "{file_path}" "{new_location}"'
        success, _, error = SSHClient.run_command(mv_cmd)
        
        if not success:
            return False, None, f"Failed to move file: {error}"
        
        logger.info(f"Moved {file_path} to {new_location}")
        return True, new_location, None
        
    except Exception as e:
        logger.exception(f"Error moving file to recycle bin: {e}")
        return False, None, str(e)

def restore_from_recycle_bin(recycle_location: str, original_path: str) -> Tuple[bool, Optional[str]]:
    """
    Restore a file from the recycle bin to its original location.
    Returns (success, error_message)
    """
    if not SSHClient.is_connected():
        return False, "SSH not connected"
    
    try:
        # Ensure the original directory exists
        original_dir = os.path.dirname(original_path)
        mkdir_cmd = f'mkdir -p "{original_dir}"'
        success, _, error = SSHClient.run_command(mkdir_cmd)
        if not success:
            return False, f"Failed to create original directory: {error}"
        
        # Move file back to original location
        mv_cmd = f'mv "{recycle_location}" "{original_path}"'
        success, _, error = SSHClient.run_command(mv_cmd)
        
        if not success:
            return False, f"Failed to restore file: {error}"
        
        logger.info(f"Restored {recycle_location} to {original_path}")
        return True, None
        
    except Exception as e:
        logger.exception(f"Error restoring file from recycle bin: {e}")
        return False, str(e)

