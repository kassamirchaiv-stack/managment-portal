import os
import secrets
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

try:
    from backend.app.auth_utils import (
        ACCESS_COOKIE_NAME,
        CSRF_COOKIE_NAME,
        ENVIRONMENT,
        get_current_user,
        limiter,
        verify_password,
        create_access_token,
    )
    from backend.app.database import get_db
    from backend.app.models import User
except ImportError:
    from app.auth_utils import (
        ACCESS_COOKIE_NAME,
        CSRF_COOKIE_NAME,
        ENVIRONMENT,
        get_current_user,
        limiter,
        verify_password,
        create_access_token,
    )
    from app.database import get_db
    from app.models import User

router = APIRouter(tags=["Authentication"])


def is_allowed_browser_origin(origin: str) -> bool:
    configured_origins = os.getenv(
        "FRONTEND_URL",
        "http://localhost:5173,https://scripts-and-fullstack-apps-6az8.vercel.app",
    )
    allowed_origins = {item.strip().rstrip("/") for item in configured_origins.split(",") if item.strip()}
    return origin.rstrip("/") in allowed_origins


class TokenResponse(BaseModel):
    session_type: str
    user_id: int
    role: str
    full_name: str
    csrf_token: str


class CurrentUserResponse(BaseModel):
    user_id: int
    username: str
    role: str
    full_name: str
    email: str


class CsrfTokenResponse(BaseModel):
    csrf_token: str


def set_auth_cookies(response: Response, access_token: str, csrf_token: str) -> None:
    secure_cookie = ENVIRONMENT == "production"
    same_site = "none" if secure_cookie else "lax"
    cookie_options = {
        "httponly": True,
        "secure": secure_cookie,
        "samesite": same_site,
        "max_age": 60 * 60 * 24,
        "path": "/",
    }
    response.set_cookie(ACCESS_COOKIE_NAME, access_token, **cookie_options)
    response.set_cookie(CSRF_COOKIE_NAME, csrf_token, **cookie_options)


@router.post("/token", response_model=TokenResponse)
@limiter.limit(os.getenv("LOGIN_RATE_LIMIT", "30/minute"))
async def login_for_access_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    origin = request.headers.get("origin")
    if origin and not is_allowed_browser_origin(origin):
        raise HTTPException(status_code=403, detail="This browser origin is not allowed to sign in.")

    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body = await request.json()
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid JSON request.") from exc
        if not isinstance(body, dict):
            raise HTTPException(status_code=400, detail="Credentials must be a JSON object.")
        username = body.get("username")
        password = body.get("password")
    else:
        form_data = await request.form()
        username = form_data.get("username")
        password = form_data.get("password")

    if not isinstance(username, str) or not isinstance(password, str) or not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password must be provided.",
        )
    if len(password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password exceeds the supported maximum length.",
        )

    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id, "role": user.role.value}
    )
    csrf_token = secrets.token_urlsafe(32)
    set_auth_cookies(response, access_token, csrf_token)
    return {
        "session_type": "cookie",
        "user_id": user.id,
        "role": user.role.value,
        "full_name": user.full_name,
        "csrf_token": csrf_token,
    }


@router.get("/api/auth/csrf", response_model=CsrfTokenResponse)
def get_csrf_token(request: Request, response: Response):
    csrf_token = request.cookies.get(CSRF_COOKIE_NAME) or secrets.token_urlsafe(32)
    secure_cookie = ENVIRONMENT == "production"
    response.set_cookie(
        CSRF_COOKIE_NAME,
        csrf_token,
        httponly=True,
        secure=secure_cookie,
        samesite="none" if secure_cookie else "lax",
        max_age=60 * 60 * 24,
        path="/",
    )
    return {"csrf_token": csrf_token}


@router.get("/api/auth/me", response_model=CurrentUserResponse)
def get_my_account(current_user: User = Depends(get_current_user)):
    return {
        "user_id": current_user.id,
        "username": current_user.username,
        "role": current_user.role.value,
        "full_name": current_user.full_name,
        "email": current_user.email,
    }


@router.post("/api/auth/logout")
def logout(response: Response, current_user: User = Depends(get_current_user)):
    secure_cookie = ENVIRONMENT == "production"
    same_site = "none" if secure_cookie else "lax"
    response.delete_cookie(
        ACCESS_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=secure_cookie,
        samesite=same_site,
    )
    response.delete_cookie(
        CSRF_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=secure_cookie,
        samesite=same_site,
    )
    return {"message": "Logged out successfully."}
