from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRouter
from backend.config import Config
from backend.db import init_db
from backend.ssh_client import SSHClient
from backend.report_discovery import list_report_folders, get_report_info

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

@api_router.get("/reports")
async def get_reports():
    if not SSHClient.is_connected():
        success, error = SSHClient.connect()
        if not success:
            return {
                "reports": [],
                "error": error
            }
    
    try:
        reports = list_report_folders()
        return {
            "reports": reports,
            "error": None,
            "debug": {
                "reports_root": Config.NAS_REPORTS_ROOT,
                "found_count": len(reports)
            }
        }
    except Exception as e:
        import traceback
        return {
            "reports": [],
            "error": str(e),
            "traceback": traceback.format_exc()
        }

@api_router.get("/reports/{report_path:path}")
async def get_report_details(report_path: str):
    if not SSHClient.is_connected():
        success, error = SSHClient.connect()
        if not success:
            return {
                "report": None,
                "error": error
            }
    
    try:
        report = get_report_info(report_path)
        if not report:
            return {
                "report": None,
                "error": "Report not found or invalid"
            }
        return {
            "report": report,
            "error": None
        }
    except Exception as e:
        return {
            "report": None,
            "error": str(e)
        }

app.include_router(api_router)

@app.on_event("startup")
async def startup_event():
    init_db()

@app.get("/")
async def root():
    return {"message": "Synology Duplicate-Review Web App API"}

