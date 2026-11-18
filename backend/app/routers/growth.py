"""Growth router — snapshots, history, changes."""

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.config import settings
from app.database import get_db
from app.models import Channel, GrowthSnapshot

router = APIRouter()


def _demo_snapshots() -> list[dict]:
    """Return 7 days of demo growth snapshots."""
    today = date.today()
    snapshots = []
    base_subs = 128000
    base_views = 8400000
    base_videos = 85
    for i in range(7):
        d = today - timedelta(days=6 - i)
        snapshots.append({
            "snapshot_date": str(d),
            "subscriber_count": base_subs + i * 60,
            "view_count": base_views + i * 3100,
            "video_count": base_videos + (1 if i >= 5 else 0),
            "demo": True,
        })
    return snapshots


@router.post("/{channel_id}/snapshot")
def take_snapshot(channel_id: str, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.channel_id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found in database")

    is_demo = settings.is_demo_mode
    today = date.today()

    existing = (
        db.query(GrowthSnapshot)
        .filter(
            GrowthSnapshot.channel_id == channel.id,
            GrowthSnapshot.snapshot_date == today,
        )
        .first()
    )
    if existing:
        existing.subscriber_count = channel.subscriber_count
        existing.view_count = channel.view_count
        existing.video_count = channel.video_count
        db.commit()
        db.refresh(existing)
        snapshot = existing
    else:
        snapshot = GrowthSnapshot(
            channel_id=channel.id,
            subscriber_count=channel.subscriber_count,
            view_count=channel.view_count,
            video_count=channel.video_count,
            snapshot_date=today,
        )
        db.add(snapshot)
        db.commit()
        db.refresh(snapshot)

    result = {
        "id": snapshot.id,
        "snapshot_date": str(snapshot.snapshot_date),
        "subscriber_count": snapshot.subscriber_count,
        "view_count": snapshot.view_count,
        "video_count": snapshot.video_count,
    }
    if is_demo:
        result["demo"] = True
    return result


@router.get("/{channel_id}/history")
def growth_history(
    channel_id: str,
    days: int = Query(28, ge=1, le=365),
    db: Session = Depends(get_db),
):
    channel = db.query(Channel).filter(Channel.channel_id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found in database")

    is_demo = settings.is_demo_mode

    if is_demo:
        return {"snapshots": _demo_snapshots(), "demo": True}

    since = date.today() - timedelta(days=days)
    snapshots = (
        db.query(GrowthSnapshot)
        .filter(
            GrowthSnapshot.channel_id == channel.id,
            GrowthSnapshot.snapshot_date >= since,
        )
        .order_by(GrowthSnapshot.snapshot_date.asc())
        .all()
    )

    return {
        "snapshots": [
            {
                "snapshot_date": str(s.snapshot_date),
                "subscriber_count": s.subscriber_count,
                "view_count": s.view_count,
                "video_count": s.video_count,
            }
            for s in snapshots
        ]
    }


@router.get("/{channel_id}/changes")
def growth_changes(channel_id: str, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.channel_id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found in database")

    is_demo = settings.is_demo_mode

    if is_demo:
        return {
            "daily_change": {"subscribers": 60, "views": 3100},
            "weekly_change": {"subscribers": 400, "views": 21300},
            "demo": True,
        }

    today = date.today()
    latest = (
        db.query(GrowthSnapshot)
        .filter(GrowthSnapshot.channel_id == channel.id)
        .order_by(GrowthSnapshot.snapshot_date.desc())
        .first()
    )
    if not latest:
        return {"daily_change": None, "weekly_change": None}

    previous_day = (
        db.query(GrowthSnapshot)
        .filter(
            GrowthSnapshot.channel_id == channel.id,
            GrowthSnapshot.snapshot_date < latest.snapshot_date,
        )
        .order_by(GrowthSnapshot.snapshot_date.desc())
        .first()
    )

    week_ago_date = latest.snapshot_date - timedelta(days=7)
    week_ago = (
        db.query(GrowthSnapshot)
        .filter(
            GrowthSnapshot.channel_id == channel.id,
            GrowthSnapshot.snapshot_date <= week_ago_date,
        )
        .order_by(GrowthSnapshot.snapshot_date.desc())
        .first()
    )

    daily_change = None
    if previous_day:
        daily_change = {
            "subscribers": (latest.subscriber_count or 0) - (previous_day.subscriber_count or 0),
            "views": (latest.view_count or 0) - (previous_day.view_count or 0),
        }

    weekly_change = None
    if week_ago:
        weekly_change = {
            "subscribers": (latest.subscriber_count or 0) - (week_ago.subscriber_count or 0),
            "views": (latest.view_count or 0) - (week_ago.view_count or 0),
        }

    return {"daily_change": daily_change, "weekly_change": weekly_change}
