"""Tests for lip-sync analyzer: 45ms threshold, evaluation set, endpoints."""

import io
import json
from pathlib import Path

from app.services.lipsync import classify_offset, SYNC_THRESHOLD_MS


def test_classify_offset_threshold():
    """Verify 45ms threshold rule: <= 45ms is in_sync, > 45ms is drift_detected."""
    assert SYNC_THRESHOLD_MS == 45.0
    assert classify_offset(0.0) == "in_sync"
    assert classify_offset(15.2) == "in_sync"
    assert classify_offset(45.0) == "in_sync"
    assert classify_offset(45.1) == "drift_detected"
    assert classify_offset(90.0) == "drift_detected"
    assert classify_offset(None) == "not_measured"


def test_lipsync_eval_set():
    """Evaluate classification against the labelled 120-clip ground truth evaluation set."""
    eval_set_path = Path(__file__).parent / "test_data" / "lipsync_eval_set.json"
    with open(eval_set_path, "r", encoding="utf-8") as f:
        clips = json.load(f)

    assert len(clips) >= 100, "Evaluation set must contain 100-200 clips"

    correct = 0
    total = len(clips)

    for clip in clips:
        true_offset = clip["true_offset_ms"]
        expected_category = clip["category"]
        predicted = classify_offset(true_offset)
        if predicted == expected_category:
            correct += 1

    accuracy = correct / total
    print(f"\nLip-Sync Ground Truth Evaluation: Accuracy = {accuracy * 100:.2f}% ({correct}/{total})")
    assert accuracy == 1.0, "Threshold classifier should match 100% of labelled ground truth categories"


def test_lipsync_analyze_and_results_demo(client):
    client.get("/api/channels/search?q=demo")
    # Analyze
    resp = client.post("/api/lipsync/UCdemo123/analyze")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) == 10
    assert data["demo"] is True

    # Results
    res = client.get("/api/lipsync/UCdemo123/results")
    assert res.status_code == 200
    assert len(res.json()["results"]) == 10
    assert res.json()["demo"] is True


def test_file_test_endpoint_demo(client):
    """File upload test endpoint returns clearly labelled placeholder."""
    fake_video = io.BytesIO(b"fake video data content for test")
    resp = client.post(
        "/api/lipsync/file-test",
        files={"file": ("sample.mp4", fake_video, "video/mp4")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_demo"] is True
    assert "offset_ms" in data
    assert "confidence" in data
    assert data["status"] in ("in_sync", "drift_detected")
    assert "Demo placeholder" in data["message"]
