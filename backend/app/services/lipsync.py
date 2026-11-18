"""Lip-sync analysis service.

NOTE: Real lip-sync detection would use a model like SyncNet to measure
audio-visual synchronization. This service provides the interface and
threshold logic. The actual neural-network inference is stubbed out —
all real videos return "not_measured" until a SyncNet model is integrated.

The threshold logic is:
  - offset_ms <= 45 → "in_sync"
  - offset_ms > 45  → "drift_detected"
  - None            → "not_measured"
"""

from dataclasses import dataclass
from typing import Optional


# Threshold in milliseconds: offsets at or below this are considered in sync
SYNC_THRESHOLD_MS = 45.0


@dataclass
class LipSyncOutput:
    """Result of a lip-sync analysis for one video."""
    video_id: str
    offset_ms: Optional[float] = None
    confidence: Optional[float] = None
    status: str = "not_measured"
    is_demo: bool = False
    message: Optional[str] = None


def classify_offset(offset_ms: Optional[float]) -> str:
    """Classify an offset measurement into a sync status."""
    if offset_ms is None:
        return "not_measured"
    if offset_ms <= SYNC_THRESHOLD_MS:
        return "in_sync"
    return "drift_detected"


def analyze_video_stub(video_id: str) -> LipSyncOutput:
    """Stub analysis — always returns not_measured for real videos.

    A real implementation would:
    1. Download a short clip of the video (e.g. 10-30 seconds of face close-up)
       using yt-dlp — though YouTube's bot protection may block this.
    2. Run SyncNet or a similar audio-visual synchronization model to
       compute the audio-video offset in milliseconds.
    3. Return the measured offset and confidence.
    """
    # NOTE: yt-dlp may be blocked by YouTube's bot protection.
    # We do NOT invent offsets for real videos. This is a placeholder.
    return LipSyncOutput(
        video_id=video_id,
        offset_ms=None,
        confidence=None,
        status="not_measured",
        message="Lip-sync analysis requires SyncNet model integration. Not yet implemented.",
    )


def demo_lipsync_results() -> list[dict]:
    """Return demo lip-sync results for the demo channel."""
    results = []
    offsets = [12.3, 8.1, 5.7, 23.5, 15.2, 67.8, 89.3, 3.4, 42.1, 51.6]
    for i in range(10):
        offset = offsets[i]
        status = classify_offset(offset)
        results.append({
            "video_id": f"demo_vid_{i+1:03d}",
            "offset_ms": offset,
            "confidence": round(0.75 + (i % 5) * 0.05, 2),
            "status": status,
            "demo": True,
        })
    return results
