import os
import hashlib
from typing import Optional
import logging
from backend.ssh_client import SSHClient
from backend.config import Config

logger = logging.getLogger(__name__)

def get_cache_key(path: str, mtime: float, size: int) -> str:
    key_string = f"{path}:{mtime}:{size}"
    return hashlib.sha256(key_string.encode()).hexdigest()

def get_thumbnail_path(cache_key: str) -> str:
    os.makedirs(os.path.join(Config.LOCAL_STATE_DIR, 'thumbnails'), exist_ok=True)
    return os.path.join(Config.LOCAL_STATE_DIR, 'thumbnails', f"{cache_key}.jpg")

def get_file_stats(remote_path: str) -> Optional[tuple]:
    success, output, _ = SSHClient.run_command(f'stat -c "%Y %s" "{remote_path}" 2>/dev/null')
    if success and output:
        try:
            parts = output.strip().split()
            mtime = float(parts[0])
            size = int(parts[1])
            return mtime, size
        except:
            pass
    return None

def fetch_and_resize_image(remote_path: str, max_size: int = 512) -> Optional[bytes]:
    logger.info(f"Fetching thumbnail for: {remote_path}")
    
    stats = get_file_stats(remote_path)
    if not stats:
        logger.warning(f"Could not get file stats for: {remote_path}")
        return None
    
    mtime, size = stats
    cache_key = get_cache_key(remote_path, mtime, size)
    cached_path = get_thumbnail_path(cache_key)
    
    if os.path.exists(cached_path):
        logger.debug(f"Using cached thumbnail: {cached_path}")
        with open(cached_path, 'rb') as f:
            return f.read()
    
    logger.info(f"Cache miss, generating thumbnail on NAS using ffmpeg: {remote_path}")
    
    # Use ffmpeg on the NAS to generate thumbnail remotely, then transfer the small file
    # This is much more efficient than downloading the full image
    try:
        if not SSHClient.is_connected():
            success, error = SSHClient.connect()
            if not success:
                logger.error(f"SSH connection failed: {error}")
                return None
        
        logger.debug(f"Running ffmpeg to generate {max_size}px thumbnail")
        
        # Use ffmpeg to resize and output to stdout as JPEG
        # Suppress ffmpeg banner and info with -loglevel error
        # -i input file
        # -vf scale to maintain aspect ratio, max dimension is max_size
        # -frames:v 1 to output only one frame
        # -c:v mjpeg for JPEG output
        # -q:v 5 for quality (2-5 is good, 2=best)
        # -f mjpeg for MJPEG format output
        ffmpeg_cmd = f'ffmpeg -loglevel error -i "{remote_path}" -vf "scale=\'min({max_size},iw)\':\'min({max_size},ih)\':force_original_aspect_ratio=decrease" -frames:v 1 -c:v mjpeg -q:v 5 -f mjpeg pipe:1'
        
        # Execute ffmpeg and capture binary output
        transport = SSHClient._client.get_transport()
        channel = transport.open_session()
        channel.exec_command(ffmpeg_cmd)
        
        # Read binary thumbnail data from stdout
        thumbnail_bytes = b''
        while True:
            chunk = channel.recv(8192)
            if not chunk:
                break
            thumbnail_bytes += chunk
        
        # Read any error output
        stderr_bytes = b''
        while channel.recv_stderr_ready():
            stderr_bytes += channel.recv_stderr(8192)
        
        exit_status = channel.recv_exit_status()
        channel.close()
        
        if exit_status != 0:
            stderr_text = stderr_bytes.decode('utf-8', errors='ignore') if stderr_bytes else 'No error output'
            logger.error(f"ffmpeg failed with exit status {exit_status}. Error: {stderr_text}")
            return None
        
        if not thumbnail_bytes:
            logger.error(f"ffmpeg succeeded but produced no output")
            return None
        
        logger.info(f"Thumbnail generated successfully: {len(thumbnail_bytes)} bytes")
        
        # Cache the thumbnail
        os.makedirs(os.path.dirname(cached_path), exist_ok=True)
        with open(cached_path, 'wb') as f:
            f.write(thumbnail_bytes)
        
        return thumbnail_bytes
        
    except Exception as e:
        logger.exception(f"Error generating thumbnail with ffmpeg: {e}")
        return None

