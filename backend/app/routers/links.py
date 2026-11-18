"""Links router — scan, results, summary."""

import asyncio
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Channel, Video, LinkCheckResult
from app.services.link_checker import extract_urls, check_links_batch

router = APIRouter()


def _demo_link_results(channel_id: int) -> list[dict]:
    """Return 20 demo link check results (15 working, 3 broken, 2 unverified)."""
    results = []
    working_urls = [
        "https://youtube.com/spectra_demo",
        "https://example.com/demo",
        "https://patreon.com/spectrademo",
        "https://twitter.com/spectrademo",
        "https://instagram.com/spectrademo",
        "https://docs.example.com/page1",
        "https://docs.example.com/page2",
        "https://docs.example.com/page3",
        "https://github.com/spectra",
        "https://discord.gg/spectra",
        "https://tiktok.com/@spectra",
        "https://facebook.com/spectra",
        "https://linkedin.com/spectra",
        "https://reddit.com/r/spectra",
        "https://twitch.tv/spectra",
    ]
    broken_urls = [
        "https://oldsite.example.com/deleted",
        "https://expired-domain.xyz/page",
        "https://removed-link.example.com/404",
    ]
    unverified_urls = [
        "https://protected-site.example.com/page",
        "https://rate-limited.example.com/api",
    ]

    for i, url in enumerate(working_urls):
        results.append({
            "url": url, "status_code": 200, "result": "working",
            "redirect_chain": "[]", "response_time_ms": 150 + i * 10,
            "video_title": f"Demo Video {(i % 10) + 1}",
            "demo": True,
        })
    for i, url in enumerate(broken_urls):
        results.append({
            "url": url, "status_code": 404, "result": "broken",
            "redirect_chain": "[]", "response_time_ms": None,
            "video_title": f"Demo Video {(i % 10) + 1}",
            "demo": True,
        })
    for i, url in enumerate(unverified_urls):
        results.append({
            "url": url, "status_code": 403, "result": "unverified",
            "redirect_chain": "[]", "response_time_ms": None,
            "video_title": f"Demo Video {(i % 10) + 1}",
            "demo": True,
        })
    return results


@router.post("/{channel_id}/scan")
async def scan_links(channel_id: str, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.channel_id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found in database")

    is_demo = settings.is_demo_mode

    if is_demo:
        demo_results = _demo_link_results(channel.id)
        return {
            "channel_id": channel_id,
            "total": len(demo_results),
            "working": 15,
            "broken": 3,
            "unverified": 2,
            "suspicious": 0,
            "demo": True,
        }

    # Get all videos for this channel
    videos = db.query(Video).filter(Video.channel_id == channel.id).all()
    if not videos:
        return {
            "channel_id": channel_id,
            "total": 0, "working": 0, "broken": 0, "unverified": 0, "suspicious": 0,
        }

    # Delete existing results for this channel
    db.query(LinkCheckResult).filter(LinkCheckResult.channel_id == channel.id).delete()
    db.commit()

    # Extract URLs from all video descriptions
    url_video_map: list[tuple[str, Video]] = []
    seen_urls: set[str] = set()
    for video in videos:
        urls = extract_urls(video.description or "")
        for url in urls:
            if url not in seen_urls:
                seen_urls.add(url)
                url_video_map.append((url, video))

    # Check all URLs
    all_urls = [u for u, _ in url_video_map]
    if all_urls:
        check_results = await check_links_batch(all_urls)
    else:
        check_results = []

    # Store results
    summary = {"working": 0, "broken": 0, "unverified": 0, "suspicious": 0}
    for (url, video), check_out in zip(url_video_map, check_results):
        import json
        result = LinkCheckResult(
            channel_id=channel.id,
            video_id=video.id,
            url=check_out.url,
            status_code=check_out.status_code,
            result=check_out.result,
            redirect_chain=json.dumps(check_out.redirect_chain),
            response_time_ms=check_out.response_time_ms,
            checked_at=datetime.utcnow(),
        )
        db.add(result)
        summary[check_out.result] = summary.get(check_out.result, 0) + 1

    db.commit()

    return {
        "channel_id": channel_id,
        "total": len(url_video_map),
        **summary,
    }


@router.get("/{channel_id}/results")
def link_results(channel_id: str, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.channel_id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found in database")

    is_demo = settings.is_demo_mode

    if is_demo:
        return {"results": _demo_link_results(channel.id), "demo": True}

    results = (
        db.query(LinkCheckResult, Video.title.label("video_title"))
        .join(Video, LinkCheckResult.video_id == Video.id)
        .filter(LinkCheckResult.channel_id == channel.id)
        .all()
    )

    return {
        "results": [
            {
                "url": r.LinkCheckResult.url,
                "status_code": r.LinkCheckResult.status_code,
                "result": r.LinkCheckResult.result,
                "redirect_chain": r.LinkCheckResult.redirect_chain,
                "response_time_ms": r.LinkCheckResult.response_time_ms,
                "checked_at": str(r.LinkCheckResult.checked_at),
                "video_title": r.video_title,
            }
            for r in results
        ]
    }


@router.get("/{channel_id}/summary")
def link_summary(channel_id: str, db: Session = Depends(get_db)):
    channel = db.query(Channel).filter(Channel.channel_id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found in database")

    is_demo = settings.is_demo_mode

    if is_demo:
        return {"total": 20, "working": 15, "broken": 3, "unverified": 2, "suspicious": 0, "demo": True}

    results = db.query(LinkCheckResult).filter(LinkCheckResult.channel_id == channel.id).all()
    summary = {"working": 0, "broken": 0, "unverified": 0, "suspicious": 0}
    for r in results:
        summary[r.result] = summary.get(r.result, 0) + 1

    return {"total": len(results), **summary}
