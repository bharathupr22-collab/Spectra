"""Channels router — search, stats, videos, top-video, refresh."""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Channel, Video
from app.services.youtube import search_channel, fetch_all_videos

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _upsert_channel(db: Session, data: dict) -> Channel:
    """Insert or update a Channel row from API/demo data."""
    channel = db.query(Channel).filter(Channel.channel_id == data["channel_id"]).first()
    if channel:
        for key in ("title", "handle", "description", "subscriber_count",
                     "view_count", "video_count", "thumbnail_url", "custom_url"):
            if key in data:
                setattr(channel, key, data[key])
        channel.last_fetched = datetime.utcnow()
    else:
        channel = Channel(
            channel_id=data["channel_id"],
            title=data.get("title", ""),
            handle=data.get("handle", ""),
            description=data.get("description", ""),
            subscriber_count=data.get("subscriber_count", 0),
            view_count=data.get("view_count", 0),
            video_count=data.get("video_count", 0),
            thumbnail_url=data.get("thumbnail_url", ""),
            custom_url=data.get("custom_url", ""),
            last_fetched=datetime.utcnow(),
        )
        db.add(channel)
    db.commit()
    db.refresh(channel)
    return channel


def _upsert_videos(db: Session, channel: Channel, videos_data: list[dict]):
    """Insert or update Video rows for a channel."""
    for vdata in videos_data:
        video = db.query(Video).filter(Video.video_id == vdata["video_id"]).first()
        if video:
            for key in ("title", "description", "thumbnail_url", "view_count",
                         "like_count", "comment_count", "published_at", "duration"):
                val = vdata.get(key)
                if key == "published_at" and isinstance(val, str) and val:
                    try:
                        val = datetime.fromisoformat(val.replace("Z", "+00:00"))
                    except Exception:
                        pass
                if val is not None:
                    setattr(video, key, val)
        else:
            published = vdata.get("published_at")
            if isinstance(published, str) and published:
                try:
                    published = datetime.fromisoformat(published.replace("Z", "+00:00"))
                except Exception:
                    published = None
            video = Video(
                video_id=vdata["video_id"],
                channel_id=channel.id,
                title=vdata.get("title", ""),
                description=vdata.get("description", ""),
                thumbnail_url=vdata.get("thumbnail_url", ""),
                view_count=vdata.get("view_count", 0),
                like_count=vdata.get("like_count", 0),
                comment_count=vdata.get("comment_count", 0),
                published_at=published,
                duration=vdata.get("duration", ""),
            )
            db.add(video)
    db.commit()


def _channel_to_dict(ch: Channel, demo: bool = False) -> dict:
    result = {
        "channel_id": ch.channel_id,
        "title": ch.title,
        "handle": ch.handle,
        "description": ch.description,
        "subscriber_count": ch.subscriber_count,
        "view_count": ch.view_count,
        "video_count": ch.video_count,
        "thumbnail_url": ch.thumbnail_url,
        "custom_url": ch.custom_url,
    }
    if demo:
        result["demo"] = True
    return result


def _video_to_dict(v: Video, demo: bool = False) -> dict:
    result = {
        "video_id": v.video_id,
        "title": v.title,
        "description": v.description,
        "thumbnail_url": v.thumbnail_url,
        "view_count": v.view_count,
        "like_count": v.like_count,
        "comment_count": v.comment_count,
        "published_at": str(v.published_at) if v.published_at else None,
        "duration": v.duration,
    }
    if demo:
        result["demo"] = True
    return result


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/search")
async def channel_search(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    """Resolve a channel by handle or name."""
    data = await search_channel(q)
    if not data:
        raise HTTPException(status_code=404, detail="Channel not found")

    is_demo = data.get("demo", False)
    channel = _upsert_channel(db, data)

    result = _channel_to_dict(channel, demo=is_demo)
    if is_demo:
        result["demo"] = True
    return result


@router.get("/{channel_id}/stats")
def channel_stats(channel_id: str, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.channel_id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found in database")

    is_demo = settings.is_demo_mode
    avg_views = 0
    if channel.video_count and channel.video_count > 0:
        avg_views = (channel.view_count or 0) // channel.video_count

    result = {
        "channel_id": channel.channel_id,
        "subscriber_count": channel.subscriber_count,
        "view_count": channel.view_count,
        "video_count": channel.video_count,
        "avg_views_per_video": avg_views,
    }
    if is_demo:
        result["demo"] = True
    return result


@router.get("/{channel_id}/videos")
async def channel_videos(
    channel_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    channel = db.query(Channel).filter(Channel.channel_id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found in database")

    is_demo = settings.is_demo_mode

    # Fetch from API if no videos cached or stale (>24h)
    video_count = db.query(Video).filter(Video.channel_id == channel.id).count()
    stale = channel.last_fetched and (datetime.utcnow() - channel.last_fetched > timedelta(hours=24))
    if video_count == 0 or stale:
        videos_data = await fetch_all_videos(channel.channel_id)
        is_demo = is_demo or any(v.get("demo") for v in videos_data)
        _upsert_videos(db, channel, videos_data)

    # Paginate from DB
    offset = (page - 1) * page_size
    videos = (
        db.query(Video)
        .filter(Video.channel_id == channel.id)
        .order_by(Video.published_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )
    total = db.query(Video).filter(Video.channel_id == channel.id).count()

    result = {
        "videos": [_video_to_dict(v, demo=is_demo) for v in videos],
        "page": page,
        "page_size": page_size,
        "total": total,
    }
    if is_demo:
        result["demo"] = True
    return result


@router.get("/{channel_id}/top-video")
def top_video(channel_id: str, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.channel_id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found in database")

    video = (
        db.query(Video)
        .filter(Video.channel_id == channel.id)
        .order_by(Video.view_count.desc())
        .first()
    )
    if not video:
        raise HTTPException(status_code=404, detail="No videos found")

    is_demo = settings.is_demo_mode
    result = _video_to_dict(video, demo=is_demo)
    if is_demo:
        result["demo"] = True
    return result


@router.post("/{channel_id}/refresh")
async def refresh_channel(channel_id: str, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.channel_id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found in database")

    is_demo = settings.is_demo_mode
    videos_data = await fetch_all_videos(channel.channel_id)
    is_demo = is_demo or any(v.get("demo") for v in videos_data)
    _upsert_videos(db, channel, videos_data)
    channel.last_fetched = datetime.utcnow()
    db.commit()

    total = db.query(Video).filter(Video.channel_id == channel.id).count()
    result = {"message": "Channel refreshed", "videos_count": total}
    if is_demo:
        result["demo"] = True
    return result
