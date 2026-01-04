import os
from typing import List, Optional, Tuple
from backend.ssh_client import SSHClient
import logging

logger = logging.getLogger(__name__)

def list_directories(parent_path: str) -> List[str]:
    """
    List directories under a given path via SSH.
    Returns a list of full paths to subdirectories.
    Excludes system directories like @eaDir.
    """
    if not SSHClient.is_connected():
        return []
    
    # Normalize the path
    parent_path = parent_path.rstrip('/')
    if not parent_path:
        parent_path = '/'
    
    # Use find command to list only directories
    # Limit depth to 1 level for performance
    # Exclude @eaDir and other Synology system folders
    command = f'find "{parent_path}" -maxdepth 1 -type d 2>/dev/null | grep -v "^\.$" | grep -v "@eaDir" | sort'
    success, output, error = SSHClient.run_command(command)
    
    if not success:
        logger.warning(f"Failed to list directories in {parent_path}: {error}")
        return []
    
    directories = []
    for line in output.strip().split('\n'):
        if not line or not line.strip():
            continue
        dir_path = line.strip()
        # Skip the parent path itself
        if dir_path != parent_path:
            # Additional filter to exclude @eaDir and other system folders
            basename = os.path.basename(dir_path)
            if basename.startswith('@') or basename == '@eaDir':
                continue
            directories.append(dir_path)
    
    return directories

def suggest_paths(partial_path: str) -> List[str]:
    """
    Suggest directory paths based on partial input.
    If partial_path ends with '/', lists directories under that path.
    Otherwise, suggests paths that match the partial input.
    """
    if not partial_path:
        # If empty, suggest common volume roots
        return suggest_volumes()
    
    # If ends with /, list directories in that path
    if partial_path.endswith('/'):
        parent_path = partial_path.rstrip('/')
        if not parent_path:
            parent_path = '/'
        dirs = list_directories(parent_path)
        return dirs[:20]  # Limit to 20 suggestions
    
    # Normalize path
    partial_path = partial_path.rstrip('/')
    
    # If it contains a slash, we're in a subdirectory
    if '/' in partial_path:
        parent = os.path.dirname(partial_path) if os.path.dirname(partial_path) else '/'
        basename = os.path.basename(partial_path)
        
        # List directories in parent (only direct children, already filtered for @eaDir)
        dirs = list_directories(parent)
        
        # Filter by basename if provided (case-insensitive, must start with)
        # This ensures only folders that start with the typed text are shown
        if basename:
            basename_lower = basename.lower()
            filtered_dirs = []
            for d in dirs:
                # Get just the basename of the directory
                dir_basename = os.path.basename(d).lower()
                # Must start with the typed basename (case-insensitive)
                if dir_basename.startswith(basename_lower):
                    filtered_dirs.append(d)
            dirs = filtered_dirs
            # Sort alphabetically
            dirs.sort(key=lambda d: os.path.basename(d).lower())
        
        return dirs[:20]  # Limit to 20 suggestions
    else:
        # Just a basename, suggest volumes with this name
        volumes = suggest_volumes()
        matching = [v for v in volumes if partial_path.lower() in v.lower()]
        return matching[:20]

def suggest_volumes() -> List[str]:
    """
    Suggest common volume paths on Synology NAS.
    """
    if not SSHClient.is_connected():
        return []
    
    # Common volume paths on Synology
    common_volumes = ['/volume1', '/volume2', '/volume3', '/volume4', '/volume5']
    
    # Check which volumes exist
    existing_volumes = []
    for vol in common_volumes:
        success, _, _ = SSHClient.run_command(f'test -d "{vol}" && echo "exists" || echo "notfound"')
        if success:
            # Check if command output indicates it exists
            success_check, output, _ = SSHClient.run_command(f'[ -d "{vol}" ] && echo "yes" || echo "no"')
            if success_check and 'yes' in (output or ''):
                existing_volumes.append(vol)
    
    return existing_volumes if existing_volumes else common_volumes[:2]  # Default to volume1, volume2

def infer_volume_path(path: str) -> str:
    """
    If path doesn't start with /volume, try to infer it.
    Returns the path with volume prefix if needed.
    """
    if not path:
        return path
    
    # If already has a volume, return as is
    if path.startswith('/volume'):
        return path
    
    # If starts with /, it's an absolute path but missing volume
    if path.startswith('/'):
        # Try to prepend /volume1
        return f'/volume1{path}'
    
    # Relative path, make it absolute with volume
    return f'/volume1/{path.lstrip("/")}'

def validate_path(path: str) -> Tuple[bool, Optional[str]]:
    """
    Validate that a path exists and is accessible via SSH.
    Returns (is_valid, error_message)
    """
    if not path or not path.strip():
        return False, "Path cannot be empty"
    
    if not SSHClient.is_connected():
        return False, "Not connected to NAS"
    
    # Normalize path
    normalized = path.rstrip('/')
    if not normalized:
        normalized = '/'
    
    # Check if path exists and is a directory
    command = f'[ -d "{normalized}" ] && echo "exists" || echo "notfound"'
    success, output, error = SSHClient.run_command(command)
    
    if not success:
        return False, f"Cannot access path: {error or 'Unknown error'}"
    
    if 'exists' not in (output or ''):
        return False, f"Path does not exist or is not a directory: {normalized}"
    
    # Check if path is readable
    command = f'[ -r "{normalized}" ] && echo "readable" || echo "notreadable"'
    success, output, _ = SSHClient.run_command(command)
    
    if not success or 'readable' not in (output or ''):
        return False, f"Path is not readable: {normalized}"
    
    return True, None

def is_subpath(child: str, parent: str) -> bool:
    """
    Check if child path is a subdirectory of parent path.
    """
    if not child or not parent:
        return False
    
    normalized_child = os.path.normpath(child)
    normalized_parent = os.path.normpath(parent)
    
    # Check if child starts with parent + separator
    return normalized_child.startswith(normalized_parent + os.sep) or normalized_child == normalized_parent

