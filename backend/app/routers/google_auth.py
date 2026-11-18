"""Google OAuth router — auth-url, callback, status, disconnect."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import GoogleConnection
from app.dependencies import get_current_user
from app.models import User
from app.services.google_oauth import (
    build_auth_url, exchange_code, get_user_email, encrypt_tokens,
)

router = APIRouter()


@router.get("/auth-url")
def auth_url():
    """Return the Google OAuth authorization URL."""
    return {"url": build_auth_url()}


@router.get("/callback")
async def oauth_callback(
    code: str = Query(...),
    db: Session = Depends(get_db),
):
    """Exchange the authorization code for tokens, store encrypted, and redirect."""
    try:
        token_data = await exchange_code(code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {e}")

    access_token = token_data.get("access_token", "")
    refresh_token = token_data.get("refresh_token", "")

    # Try to get user email from Google
    email = await get_user_email(access_token) if access_token else None

    # Encrypt tokens
    enc_access, enc_refresh = encrypt_tokens(access_token, refresh_token)

    # For the callback flow, we don't have the user's JWT here (it's a redirect).
    # In a production app, you'd pass state with the user ID or use a session.
    # For now, store with user_id=1 as a simplified flow or look up by email.
    user = None
    if email:
        user = db.query(User).filter(User.email == email).first()

    if not user:
        # Fallback: get the most recent user (simplified for demo)
        user = db.query(User).order_by(User.id.desc()).first()

    if not user:
        raise HTTPException(status_code=400, detail="No user account found. Please sign up first.")

    # Upsert Google connection
    existing = db.query(GoogleConnection).filter(GoogleConnection.user_id == user.id).first()
    if existing:
        existing.access_token_encrypted = enc_access
        existing.refresh_token_encrypted = enc_refresh
        existing.token_expiry = None  # Could parse from token_data
        existing.scopes = token_data.get("scope", "")
        existing.connected_at = datetime.utcnow()
    else:
        conn = GoogleConnection(
            user_id=user.id,
            access_token_encrypted=enc_access,
            refresh_token_encrypted=enc_refresh,
            scopes=token_data.get("scope", ""),
            connected_at=datetime.utcnow(),
        )
        db.add(conn)

    db.commit()

    # Redirect to frontend settings page
    return RedirectResponse(url="http://localhost:3000/settings")


@router.get("/status")
def google_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the Google connection status for the current user."""
    conn = db.query(GoogleConnection).filter(GoogleConnection.user_id == current_user.id).first()
    if not conn:
        return {"connected": False, "email": None, "connected_at": None}

    return {
        "connected": True,
        "email": current_user.email,
        "connected_at": str(conn.connected_at) if conn.connected_at else None,
    }


@router.post("/disconnect")
def disconnect_google(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete the Google connection for the current user."""
    conn = db.query(GoogleConnection).filter(GoogleConnection.user_id == current_user.id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="No Google connection found")

    db.delete(conn)
    db.commit()
    return {"message": "Google account disconnected"}
