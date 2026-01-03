import os
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

class Config:
    NAS_HOST: Optional[str] = os.getenv("NAS_HOST")
    NAS_PORT: int = int(os.getenv("NAS_PORT", "22"))
    NAS_USER: Optional[str] = os.getenv("NAS_USER")
    NAS_PASSWORD: Optional[str] = os.getenv("NAS_PASSWORD")
    NAS_SSH_KEY_PATH: Optional[str] = os.getenv("NAS_SSH_KEY_PATH")
    NAS_SSH_KEY_PASSPHRASE: Optional[str] = os.getenv("NAS_SSH_KEY_PASSPHRASE")
    NAS_REPORTS_ROOT: Optional[str] = os.getenv("NAS_REPORTS_ROOT")
    BACKUP_ROOT: Optional[str] = os.getenv("BACKUP_ROOT")
    SORTED_ROOT: Optional[str] = os.getenv("SORTED_ROOT")
    LOCAL_STATE_DIR: str = os.getenv("LOCAL_STATE_DIR", "./state")
    RECYCLE_DIR_NAME: Optional[str] = os.getenv("RECYCLE_DIR_NAME")
    THUMB_MAX_SIZE: int = int(os.getenv("THUMB_MAX_SIZE", "512"))

    @classmethod
    def get_status(cls) -> dict:
        return {
            "nas_host": cls.NAS_HOST is not None,
            "nas_user": cls.NAS_USER is not None,
            "nas_password": cls.NAS_PASSWORD is not None or cls.NAS_SSH_KEY_PATH is not None,
            "nas_reports_root": cls.NAS_REPORTS_ROOT is not None,
            "backup_root": cls.BACKUP_ROOT is not None,
            "sorted_root": cls.SORTED_ROOT is not None,
            "local_state_dir": cls.LOCAL_STATE_DIR,
        }
    
    @classmethod
    def is_backup_path(cls, path: str) -> bool:
        if not cls.BACKUP_ROOT:
            return False
        normalized_path = os.path.normpath(path)
        normalized_backup = os.path.normpath(cls.BACKUP_ROOT)
        return normalized_path.startswith(normalized_backup + os.sep) or normalized_path == normalized_backup
    
    @classmethod
    def is_sorted_path(cls, path: str) -> bool:
        if not cls.SORTED_ROOT:
            return False
        if cls.is_backup_path(path):
            return False
        normalized_path = os.path.normpath(path)
        normalized_sorted = os.path.normpath(cls.SORTED_ROOT)
        return normalized_path.startswith(normalized_sorted + os.sep) or normalized_path == normalized_sorted


