import os
import hashlib
import tempfile
from typing import Optional
from PIL import Image
import io
from backend.ssh_client import SSHClient
from backend.config import Config

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
    stats = get_file_stats(remote_path)
    if not stats:
        return None
    
    mtime, size = stats
    cache_key = get_cache_key(remote_path, mtime, size)
    cached_path = get_thumbnail_path(cache_key)
    
    if os.path.exists(cached_path):
        with open(cached_path, 'rb') as f:
            return f.read()
    
    sftp = SSHClient.get_sftp()
    if not sftp:
        return None
    
    try:
        with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
            local_path = tmp_file.name
        
        sftp.get(remote_path, local_path)
        
        try:
            with Image.open(local_path) as img:
                img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
                
                if img.mode in ('RGBA', 'LA', 'P'):
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                    img = background
                elif img.mode != 'RGB':
                    img = img.convert('RGB')
                
                output = io.BytesIO()
                img.save(output, format='JPEG', quality=85, optimize=True)
                thumbnail_bytes = output.getvalue()
                
                os.makedirs(os.path.dirname(cached_path), exist_ok=True)
                with open(cached_path, 'wb') as f:
                    f.write(thumbnail_bytes)
                
                return thumbnail_bytes
        finally:
            if os.path.exists(local_path):
                os.unlink(local_path)
                
    except Exception as e:
        print(f"Error processing image {remote_path}: {e}")
        return None

