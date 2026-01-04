from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRouter
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
from backend.config import Config
from backend.db import init_db
from backend.ssh_client import SSHClient
from backend.duplicate_scanner import find_duplicates, save_duplicates_to_db, get_duplicates_from_db, get_scan_sessions
from backend.thumbnail_service import fetch_and_resize_image
from backend.path_utils import suggest_paths, validate_path, infer_volume_path, is_subpath
from backend.review_actions import ignore_duplicate, delete_duplicate, undo_last_action, get_review_stats
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

app = FastAPI(title="Synology Duplicate-Review Web App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

@api_router.get("/health")
async def health():
    return {"status": "ok"}

@api_router.get("/status")
async def status():
    return {
        "config": Config.get_status(),
        "db_initialized": True
    }

@api_router.get("/connection")
async def connection_status():
    is_connected = SSHClient.is_connected()
    if not is_connected:
        success, error = SSHClient.connect()
        return {
            "connected": success,
            "error": error
        }
    return {
        "connected": True,
        "error": None
    }

@api_router.post("/connection/test")
async def test_connection():
    SSHClient.disconnect()
    success, error = SSHClient.connect()
    return {
        "connected": success,
        "error": error
    }

class ScanRequest(BaseModel):
    backup_path: str
    sorted_path: str

@api_router.post("/scan/start")
async def start_scan(request: ScanRequest):
    """Start a duplicate scan between two folders."""
    if not SSHClient.is_connected():
        success, error = SSHClient.connect()
        if not success:
            raise HTTPException(status_code=500, detail=f"SSH connection failed: {error}")
    
    try:
        logger.info(f"Starting scan: backup={request.backup_path}, sorted={request.sorted_path}")
        duplicate_pairs = find_duplicates(request.backup_path, request.sorted_path)
        
        # Save to database
        scan_session_id = save_duplicates_to_db(duplicate_pairs)
        
        return {
            "success": True,
            "duplicate_count": len(duplicate_pairs),
            "scan_session_id": scan_session_id
        }
    except Exception as e:
        logger.exception("Error during scan")
        raise HTTPException(status_code=500, detail=f"Scan failed: {str(e)}")

@api_router.get("/scan/sessions")
async def get_sessions():
    """Get all scan sessions."""
    try:
        sessions = get_scan_sessions()
        return {
            "sessions": sessions,
            "error": None
        }
    except Exception as e:
        logger.exception("Error getting scan sessions")
        return {
            "sessions": [],
            "error": str(e)
        }

@api_router.get("/scan/duplicates")
async def get_duplicates(scan_session_id: Optional[str] = None, limit: Optional[int] = None, offset: int = 0):
    """Get duplicate pairs from a scan session."""
    try:
        pairs = get_duplicates_from_db(scan_session_id, limit, offset)
        return {
            "pairs": pairs,
            "count": len(pairs),
            "error": None
        }
    except Exception as e:
        logger.exception("Error getting duplicates")
        return {
            "pairs": [],
            "count": 0,
            "error": str(e)
        }

@api_router.get("/paths/suggest")
async def suggest_paths_endpoint(partial: str = ""):
    """Get path suggestions for autocomplete."""
    if not SSHClient.is_connected():
        success, error = SSHClient.connect()
        if not success:
            return {
                "suggestions": [],
                "error": error
            }
    
    try:
        # Auto-infer volume if needed
        if partial and not partial.startswith('/volume'):
            partial = infer_volume_path(partial)
        
        suggestions = suggest_paths(partial)
        return {
            "suggestions": suggestions,
            "error": None
        }
    except Exception as e:
        logger.exception("Error getting path suggestions")
        return {
            "suggestions": [],
            "error": str(e)
        }

class ValidatePathRequest(BaseModel):
    path: str

@api_router.post("/paths/validate")
async def validate_path_endpoint(request: ValidatePathRequest):
    """Validate that a path exists and is accessible."""
    if not SSHClient.is_connected():
        success, error = SSHClient.connect()
        if not success:
            return {
                "valid": False,
                "error": f"SSH connection failed: {error}"
            }
    
    try:
        path = request.path
        # Auto-infer volume if needed
        if path and not path.startswith('/volume'):
            path = infer_volume_path(path)
        
        is_valid, error_msg = validate_path(path)
        return {
            "valid": is_valid,
            "normalized_path": path if is_valid else None,
            "error": error_msg
        }
    except Exception as e:
        logger.exception("Error validating path")
        return {
            "valid": False,
            "normalized_path": None,
            "error": str(e)
        }

class ValidatePathsRequest(BaseModel):
    backup_path: str
    sorted_path: str

@api_router.post("/paths/validate-pair")
async def validate_paths_pair(request: ValidatePathsRequest):
    """Validate both paths and check if backup is subfolder of sorted."""
    if not SSHClient.is_connected():
        success, error = SSHClient.connect()
        if not success:
            return {
                "valid": False,
                "errors": [f"SSH connection failed: {error}"],
                "warnings": []
            }
    
    errors = []
    warnings = []
    
    # Auto-infer volumes
    backup_path = infer_volume_path(request.backup_path) if request.backup_path else ""
    sorted_path = infer_volume_path(request.sorted_path) if request.sorted_path else ""
    
    # Validate backup path
    if backup_path:
        is_valid, error_msg = validate_path(backup_path)
        if not is_valid:
            errors.append(f"Backup path: {error_msg}")
    else:
        errors.append("Backup path is required")
    
    # Validate sorted path
    if sorted_path:
        is_valid, error_msg = validate_path(sorted_path)
        if not is_valid:
            errors.append(f"Sorted path: {error_msg}")
    else:
        errors.append("Sorted path is required")
    
    # Check if backup is subfolder of sorted
    if backup_path and sorted_path and is_subpath(backup_path, sorted_path):
        warnings.append("Backup path is a subfolder of Sorted path. It will be excluded from the search automatically.")
    
    return {
        "valid": len(errors) == 0,
        "backup_path": backup_path if backup_path and not errors else None,
        "sorted_path": sorted_path if sorted_path and not errors else None,
        "errors": errors,
        "warnings": warnings
    }

@api_router.get("/thumb")
async def get_thumbnail(path: str):
    from urllib.parse import unquote
    path = unquote(path)
    
    if not path:
        raise HTTPException(status_code=400, detail="Path parameter required")
    
    if not SSHClient.is_connected():
        success, error = SSHClient.connect()
        if not success:
            raise HTTPException(status_code=500, detail=error)
    
    try:
        thumbnail_bytes = fetch_and_resize_image(path, max_size=Config.THUMB_MAX_SIZE)
        if not thumbnail_bytes:
            raise HTTPException(status_code=404, detail="Thumbnail not available")
        
        return Response(content=thumbnail_bytes, media_type="image/jpeg")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ReviewActionRequest(BaseModel):
    review_id: int
    backup_path: str
    sorted_path: str
    session_id: str
    recycle_bin_path: Optional[str] = None

@api_router.post("/review/ignore")
async def ignore_review(request: ReviewActionRequest):
    """Mark a duplicate pair as ignored."""
    try:
        success, error = ignore_duplicate(request.review_id, request.backup_path, request.sorted_path)
        if not success:
            raise HTTPException(status_code=500, detail=error)
        
        return {"success": True, "action": "ignored"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error ignoring duplicate")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/review/delete")
async def delete_review(request: ReviewActionRequest):
    """Delete a duplicate by moving to recycle bin."""
    try:
        success, error, undo_info = delete_duplicate(
            request.review_id, 
            request.backup_path, 
            request.session_id,
            request.recycle_bin_path
        )
        if not success:
            raise HTTPException(status_code=500, detail=error)
        
        return {"success": True, "action": "deleted", "undo_info": undo_info}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error deleting duplicate")
        raise HTTPException(status_code=500, detail=str(e))

class UndoRequest(BaseModel):
    session_id: str

@api_router.post("/review/undo")
async def undo_review(request: UndoRequest):
    """Undo the last review action."""
    try:
        success, error, action_type = undo_last_action(request.session_id)
        if not success:
            raise HTTPException(status_code=400, detail=error or "Nothing to undo")
        
        return {"success": True, "undone_action": action_type}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error undoing action")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/review/stats")
async def review_stats(scan_session_id: str):
    """Get review statistics for a scan session."""
    try:
        stats = get_review_stats(scan_session_id)
        return stats
    except Exception as e:
        logger.exception("Error getting review stats")
        raise HTTPException(status_code=500, detail=str(e))

app.include_router(api_router)

@app.on_event("startup")
async def startup_event():
    init_db()

@app.get("/")
async def root():
    return {"message": "Synology Duplicate-Review Web App API"}

