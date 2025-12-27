from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRouter

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

app.include_router(api_router)

@app.get("/")
async def root():
    return {"message": "Synology Duplicate-Review Web App API"}

