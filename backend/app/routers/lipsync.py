"""Lip-sync router — analyze, results, file-test."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Channel, Video, LipSyncResult
from app.services.lipsync import (
    analyze_video_stub, classify_offset, demo_lipsync_results, SYNC_THRESHOLD_MS,
)

router = APIRouter()


@router.post("/{channel_id}/analyze")
def analyze_channel(channel_id: str, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.channel_id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found in database")

    is_demo = settings.is_demo_mode

    if is_demo:
        demo_results = demo_lipsync_results()
        return {"results": demo_results, "demo": True}

    # For real videos: create "not_measured" entries
    videos = db.query(Video).filter(Video.channel_id == channel.id).all()
    if not videos:
        return {"results": [], "message": "No videos found for this channel"}

    # Clear existing results for this channel's videos
    video_ids = [v.id for v in videos]
    db.query(LipSyncResult).filter(LipSyncResult.video_id.in_(video_ids)).delete(
        synchronize_session=False
    )
    db.commit()

    results = []
    for video in videos:
        # Real analysis would use SyncNet — for now, mark as not_measured
        stub = analyze_video_stub(video.video_id)
        lr = LipSyncResult(
            video_id=video.id,
            offset_ms=stub.offset_ms,
            confidence=stub.confidence,
            status=stub.status,
            measured_at=datetime.utcnow(),
        )
        db.add(lr)
        results.append({
            "video_id": video.video_id,
            "offset_ms": stub.offset_ms,
            "confidence": stub.confidence,
            "status": stub.status,
        })

    db.commit()
    return {"results": results}


@router.get("/{channel_id}/results")
def lipsync_results(channel_id: str, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.channel_id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found in database")

    is_demo = settings.is_demo_mode

    if is_demo:
        return {"results": demo_lipsync_results(), "demo": True}

    videos = db.query(Video).filter(Video.channel_id == channel.id).all()
    video_ids = [v.id for v in videos]
    video_map = {v.id: v.video_id for v in videos}

    results = db.query(LipSyncResult).filter(LipSyncResult.video_id.in_(video_ids)).all()

    return {
        "results": [
            {
                "video_id": video_map.get(r.video_id, ""),
                "offset_ms": r.offset_ms,
                "confidence": r.confidence,
                "status": r.status,
                "measured_at": str(r.measured_at) if r.measured_at else None,
            }
            for r in results
        ]
    }


@router.post("/file-test")
async def file_test(file: UploadFile = File(...)):
    """Accept a video file upload and return a demo/placeholder lip-sync result.

    A real implementation would:
    1. Save the uploaded video to a temp directory
    2. Extract audio and video streams
    3. Run SyncNet or a similar model to compute the offset
    4. Return the measured offset and confidence

    This endpoint is clearly labelled as a demo placeholder.
    """
    # Read enough to confirm it's a file, but don't process
    content = await file.read(1024)
    await file.close()

    return {
        "offset_ms": 15.0,
        "confidence": 0.85,
        "status": "in_sync",
        "is_demo": True,
        "message": (
            "Demo placeholder — real lip-sync analysis requires SyncNet model integration. "
            "This result is NOT a real measurement."
        ),
        "filename": file.filename,
        "content_type": file.content_type,
    }
