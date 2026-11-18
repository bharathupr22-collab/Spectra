"""Google OAuth service — build auth URL, exchange code, store tokens."""

from datetime import datetime
from urllib.parse import urlencode

import httpx

from app.config import settings
from app.security import encrypt_token, decrypt_token

GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo"

SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
]


def build_auth_url() -> str:
    """Build the Google OAuth authorization URL."""
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
    }
    return f"{GOOGLE_AUTH_ENDPOINT}?{urlencode(params)}"


async def exchange_code(code: str) -> dict:
    """Exchange an authorization code for tokens. Returns token dict."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            GOOGLE_TOKEN_ENDPOINT,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()


async def get_user_email(access_token: str) -> str | None:
    """Fetch the Google user's email using the access token."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            GOOGLE_USERINFO_ENDPOINT,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        if resp.status_code == 200:
            return resp.json().get("email")
    return None


def encrypt_tokens(access_token: str, refresh_token: str) -> tuple[str, str]:
    """Encrypt OAuth tokens for storage."""
    return encrypt_token(access_token), encrypt_token(refresh_token)


def decrypt_tokens(enc_access: str, enc_refresh: str) -> tuple[str, str]:
    """Decrypt stored OAuth tokens."""
    return decrypt_token(enc_access), decrypt_token(enc_refresh)
