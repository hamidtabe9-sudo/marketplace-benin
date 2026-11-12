from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .auth import router as auth_router
from .database import init_db
from .listings import router as listings_router
from . import auth_models  # noqa: F401
from .messaging import router as messaging_router
from . import messaging_models  # noqa: F401
init_db()

UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="BIZNESS API", version="0.3.0")
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")
app.include_router(auth_router)
app.include_router(listings_router)
app.include_router(messaging_router)


@app.get("/health", tags=["Santé"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
