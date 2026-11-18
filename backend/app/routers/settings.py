"""Settings router — API key status and connection overview."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_optional_user
from app.models import User, GoogleConnection, Channel

router = APIRouter()


@router.get("/status")
def settings_status(
    current_user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Return status of API key configuration, Google connection, and channel connection."""
    api_key_configured = bool(settings.YOUTUBE_API_KEY and settings.YOUTUBE_API_KEY.strip())
    
    google_connected = False
    channel_connected = False

    if current_user:
        gconn = db.query(GoogleConnection).filter(GoogleConnection.user_id == current_user.id).first()
        google_connected = gconn is not None
        user_channels = db.query(Channel).filter(Channel.user_id == current_user.id).count()
        channel_connected = user_channels > 0
    else:
        # Check if any channel is cached in DB
        total_channels = db.query(Channel).count()
        channel_connected = total_channels > 0

    return {
        "api_key_configured": api_key_configured,
        "google_connected": google_connected,
        "channel_connected": channel_connected,
        "demo_mode": settings.is_demo_mode,
    }
