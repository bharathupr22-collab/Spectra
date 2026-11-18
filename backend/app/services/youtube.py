"""YouTube Data API client + demo mode fallbacks."""

from datetime import datetime
from typing import Optional

import httpx

from app.config import settings


# ---------------------------------------------------------------------------
# Demo data generators
# ---------------------------------------------------------------------------

def _demo_channel(query: str = "") -> dict:
    return {
        "channel_id": "UCdemo123",
        "title": "Spectra Demo Channel",
        "handle": "@spectra_demo",
        "description": "This is a demo channel for Spectra analytics.",
        "subscriber_count": 128400,
        "view_count": 8421390,
        "video_count": 87,
        "thumbnail_url": "",
        "custom_url": "@spectra_demo",
        "demo": True,
    }


def _demo_videos() -> list[dict]:
    titles = [
        "Demo Video 1: Getting Started",
        "Demo Video 2: Advanced Tips",
        "Demo Video 3: Behind the Scenes",
        "Demo Video 4: Q&A Session",
        "Demo Video 5: Tutorial Deep Dive",
        "Demo Video 6: Product Review",
        "Demo Video 7: Live Stream Highlights",
        "Demo Video 8: Collaboration Special",
        "Demo Video 9: Viewer Requests",
        "Demo Video 10: Year in Review",
    ]
    videos = []
    base_views = [487320, 352100, 298450, 215600, 189700, 156300, 134200, 112500, 95800, 72400]
    for i, title in enumerate(titles):
        videos.append({
            "video_id": f"demo_vid_{i+1:03d}",
            "title": title,
            "description": (
                f"Welcome to {title}! Check out https://example.com/demo "
                f"and visit patreon.com/spectrademo for more. "
                f"Follow me @spectra_demo #youtube #demo "
                f"Contact: demo@spectra.example.com "
                f"More links: bit.ly/spectra{i+1} https://docs.example.com/page{i+1}"
            ),
            "thumbnail_url": "",
            "view_count": base_views[i],
            "like_count": base_views[i] // 20,
            "comment_count": base_views[i] // 100,
            "published_at": f"2024-{(i % 12) + 1:02d}-{(i % 28) + 1:02d}T12:00:00Z",
            "duration": f"PT{10 + i * 3}M{i * 7 % 60}S",
            "demo": True,
        })
    return videos


# ---------------------------------------------------------------------------
# Real YouTube API calls
# ---------------------------------------------------------------------------

async def search_channel(query: str) -> dict | None:
    """Resolve a channel by handle or name. Returns channel dict or None."""
    if settings.is_demo_mode:
        return _demo_channel(query)

    async with httpx.AsyncClient() as client:
        # Try forHandle first
        handle = query.lstrip("@")
        resp = await client.get(
            "https://www.googleapis.com/youtube/v3/channels",
            params={
                "part": "snippet,statistics",
                "forHandle": handle,
                "key": settings.YOUTUBE_API_KEY,
            },
            timeout=15,
        )
        data = resp.json()
        items = data.get("items", [])
        if items:
            return _parse_channel(items[0])

        # Fallback: search.list
        resp = await client.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={
                "part": "snippet",
                "type": "channel",
                "q": query,
                "maxResults": 1,
                "key": settings.YOUTUBE_API_KEY,
            },
            timeout=15,
        )
        data = resp.json()
        items = data.get("items", [])
        if not items:
            return None

        channel_id = items[0]["snippet"]["channelId"]
        # Fetch full channel info
        resp = await client.get(
            "https://www.googleapis.com/youtube/v3/channels",
            params={
                "part": "snippet,statistics",
                "id": channel_id,
                "key": settings.YOUTUBE_API_KEY,
            },
            timeout=15,
        )
        data = resp.json()
        items = data.get("items", [])
        if items:
            return _parse_channel(items[0])

    return None


def _parse_channel(item: dict) -> dict:
    snippet = item.get("snippet", {})
    stats = item.get("statistics", {})
    thumbnails = snippet.get("thumbnails", {})
    thumb = thumbnails.get("default", {}).get("url", "")
    return {
        "channel_id": item["id"],
        "title": snippet.get("title", ""),
        "handle": snippet.get("customUrl", ""),
        "description": snippet.get("description", ""),
        "subscriber_count": int(stats.get("subscriberCount", 0)),
        "view_count": int(stats.get("viewCount", 0)),
        "video_count": int(stats.get("videoCount", 0)),
        "thumbnail_url": thumb,
        "custom_url": snippet.get("customUrl", ""),
    }


async def fetch_all_videos(channel_id: str) -> list[dict]:
    """Fetch all videos for a channel using the uploads playlist.

    Uses playlistItems.list with the uploads playlist (channel_id → UU prefix),
    paginates with pageToken, then fetches stats in batches of 50 with videos.list.
    """
    if settings.is_demo_mode:
        return _demo_videos()

    # Derive uploads playlist ID: replace 'UC' prefix with 'UU'
    uploads_playlist_id = "UU" + channel_id[2:] if channel_id.startswith("UC") else channel_id

    video_ids: list[str] = []

    async with httpx.AsyncClient() as client:
        page_token: Optional[str] = None
        while True:
            params = {
                "part": "snippet",
                "playlistId": uploads_playlist_id,
                "maxResults": 50,
                "key": settings.YOUTUBE_API_KEY,
            }
            if page_token:
                params["pageToken"] = page_token

            resp = await client.get(
                "https://www.googleapis.com/youtube/v3/playlistItems",
                params=params,
                timeout=15,
            )
            data = resp.json()
            for item in data.get("items", []):
                vid_id = item["snippet"]["resourceId"]["videoId"]
                video_ids.append(vid_id)

            page_token = data.get("nextPageToken")
            if not page_token:
                break

        # Fetch video details in batches of 50
        videos: list[dict] = []
        for i in range(0, len(video_ids), 50):
            batch = video_ids[i : i + 50]
            resp = await client.get(
                "https://www.googleapis.com/youtube/v3/videos",
                params={
                    "part": "snippet,statistics,contentDetails",
                    "id": ",".join(batch),
                    "key": settings.YOUTUBE_API_KEY,
                },
                timeout=15,
            )
            data = resp.json()
            for item in data.get("items", []):
                videos.append(_parse_video(item))

    return videos


def _parse_video(item: dict) -> dict:
    snippet = item.get("snippet", {})
    stats = item.get("statistics", {})
    details = item.get("contentDetails", {})
    thumbnails = snippet.get("thumbnails", {})
    thumb = thumbnails.get("default", {}).get("url", "")
    return {
        "video_id": item["id"],
        "title": snippet.get("title", ""),
        "description": snippet.get("description", ""),
        "thumbnail_url": thumb,
        "view_count": int(stats.get("viewCount", 0)),
        "like_count": int(stats.get("likeCount", 0)),
        "comment_count": int(stats.get("commentCount", 0)),
        "published_at": snippet.get("publishedAt", ""),
        "duration": details.get("duration", ""),
    }
