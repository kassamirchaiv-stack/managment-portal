import os
import sys

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import hmac
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import APIKeyCookie
from jose import JWTError, jwt
from passlib.context import CryptContext
from passlib.exc import InvalidHashError, UnknownHashError
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

try:
    from backend.app.database import get_db
    from backend.app.models import User, UserRole
except ImportError:
    from app.database import get_db
    from app.models import User, UserRole

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    if ENVIRONMENT == "production":
        raise RuntimeError("SECRET_KEY must be configured in production.")
    SECRET_KEY = "development-only-secret-key-do-not-use-in-production"
if ENVIRONMENT == "production" and len(SECRET_KEY) < 32:
    raise RuntimeError("SECRET_KEY must contain at least 32 characters in production.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
ACCESS_COOKIE_NAME = "school_access_token"
CSRF_COOKIE_NAME = "school_csrf_token"
CSRF_HEADER_NAME = "X-CSRF-Token"
PASSWORD_CONTEXT = CryptContext(schemes=["bcrypt"], deprecated="auto")
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=os.getenv("RATE_LIMIT_STORAGE_URI") or None,
)

session_cookie = APIKeyCookie(name=ACCESS_COOKIE_NAME, auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain text password against the stored password hash."""
    try:
        return PASSWORD_CONTEXT.verify(plain_password, hashed_password)
    except (InvalidHashError, UnknownHashError, ValueError):
        return False


def hash_password(password: str) -> str:
    """Create a bcrypt password hash; hashing errors must not degrade security."""
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Passwords must be no longer than 72 UTF-8 bytes.")
    return PASSWORD_CONTEXT.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token containing user claims."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(
    request: Request,
    token: Optional[str] = Depends(session_cookie),
    db: Session = Depends(get_db),
) -> User:
    """FastAPI dependency to extract and validate the logged-in user from the JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    if token:
        if request.method not in {"GET", "HEAD", "OPTIONS"}:
            csrf_cookie = request.cookies.get(CSRF_COOKIE_NAME, "")
            csrf_header = request.headers.get(CSRF_HEADER_NAME, "")
            if not csrf_cookie or not hmac.compare_digest(
                csrf_cookie.encode("utf-8"), csrf_header.encode("utf-8")
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="CSRF validation failed.",
                )

    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


def require_roles(allowed_roles: List[UserRole]):
    """Dependency factory to enforce role-based access control."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: User role '{current_user.role.value}' does not have sufficient permissions.",
            )
        return current_user
    return role_checker
