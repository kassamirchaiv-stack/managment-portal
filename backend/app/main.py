import os
import sys
from contextlib import asynccontextmanager

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

try:
    from backend.app.database import engine, Base, SessionLocal
    from backend.app.auth_utils import ENVIRONMENT, limiter
    from backend.app.routers import auth, parent, teacher, admin, student
except ImportError:
    from app.database import engine, Base, SessionLocal
    from app.auth_utils import ENVIRONMENT, limiter
    from app.routers import auth, parent, teacher, admin, student

# Keep local schema setup convenient; production schema changes use Alembic.
@asynccontextmanager
async def lifespan(app: FastAPI):
    if ENVIRONMENT == "production":
        if engine.url.get_backend_name() != "postgresql":
            raise RuntimeError("Production deployments must use a persistent PostgreSQL database.")
        if not os.getenv("FRONTEND_URL"):
            raise RuntimeError("FRONTEND_URL must be configured in production.")
        if any(
            not origin.strip().startswith("https://")
            for origin in os.environ["FRONTEND_URL"].split(",")
            if origin.strip()
        ):
            raise RuntimeError("Production FRONTEND_URL origins must use HTTPS.")
        if os.getenv("SEED_ON_STARTUP", "false").lower() == "true":
            raise RuntimeError("SEED_ON_STARTUP must not be enabled in production.")
    else:
        Base.metadata.create_all(bind=engine)

    # One-time convenience seed, gated behind an env var so it's opt-in and
    # never runs unintentionally against a database that already has data.
    if os.getenv("SEED_ON_STARTUP", "false").lower() == "true":
        try:
            from backend.app.seed_data import seed_data
        except ImportError:
            from app.seed_data import seed_data
        db = SessionLocal()
        try:
            seed_data(db)
        finally:
            db.close()

    yield

app = FastAPI(
    title="School Management System API",
    description="Parent & Student Portal Backend API with Role-Based Access Control",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if ENVIRONMENT == "production" else "/docs",
    redoc_url=None if ENVIRONMENT == "production" else "/redoc",
    openapi_url=None if ENVIRONMENT == "production" else "/openapi.json",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Parse allowed origins from environment variable with local fallback
frontend_url = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173,https://scripts-and-fullstack-apps-6az8.vercel.app",
)
allowed_origins = [
    origin.strip().rstrip("/") for origin in frontend_url.split(",") if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router)
app.include_router(parent.router)
app.include_router(teacher.router)
app.include_router(admin.router)
app.include_router(student.router)


@app.get("/")
@app.head("/")
def read_root():
    return {
        "app": "School Management System API",
        "status": "running",
        "docs": "/docs" if ENVIRONMENT != "production" else None,
    }


@app.get("/api/health")
def health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail="Database is unavailable.") from exc
    return {"status": "ok", "database": "connected"}