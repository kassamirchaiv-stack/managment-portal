import os
import sys

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


# Use a fresh local database by default; the tracked school_system.db is a
# legacy demo snapshot with obsolete password hashes and schema.
_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "school_system_dev.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.path.abspath(_DB_PATH)}")

# Render (and some other providers) hand out "postgres://" or "postgresql://"
# URLs. Pin the psycopg2 driver explicitly: SQLAlchemy 2.1+ defaults the bare
# "postgresql://" scheme to psycopg (v3), which isn't installed.
for _prefix in ("postgres://", "postgresql://"):
    if DATABASE_URL.startswith(_prefix):
        DATABASE_URL = "postgresql+psycopg2://" + DATABASE_URL[len(_prefix):]
        break

# connect_args={"check_same_thread": False} is required only for SQLite
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency that provides a database session for FastAPI endpoints."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
