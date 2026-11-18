"""Tests for channel endpoints."""

def test_channel_search_demo_mode(client):
    resp = client.get("/api/channels/search?q=@spectra_demo")
    assert resp.status_code == 200
    data = resp.json()
    assert data["channel_id"] == "UCdemo123"
    assert data["handle"] == "@spectra_demo"
    assert data["subscriber_count"] == 128400
    assert data["view_count"] == 8421390
    assert data["video_count"] == 87
    assert data["demo"] is True


def test_channel_stats(client):
    # First search to populate DB
    client.get("/api/channels/search?q=demo")
    resp = client.get("/api/channels/UCdemo123/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["subscriber_count"] == 128400
    assert data["video_count"] == 87
    assert data["avg_views_per_video"] == 8421390 // 87
    assert data["demo"] is True


def test_channel_videos_paginated(client):
    client.get("/api/channels/search?q=demo")
    resp = client.get("/api/channels/UCdemo123/videos?page=1&page_size=5")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["videos"]) <= 5
    assert data["page"] == 1
    assert data["page_size"] == 5
    assert data["total"] > 0
    assert data["demo"] is True


def test_channel_top_video(client):
    client.get("/api/channels/search?q=demo")
    # Load videos first
    client.get("/api/channels/UCdemo123/videos")
    resp = client.get("/api/channels/UCdemo123/top-video")
    assert resp.status_code == 200
    data = resp.json()
    assert "video_id" in data
    assert "view_count" in data
    assert data["demo"] is True


def test_channel_refresh(client):
    client.get("/api/channels/search?q=demo")
    resp = client.post("/api/channels/UCdemo123/refresh")
    assert resp.status_code == 200
    data = resp.json()
    assert data["videos_count"] > 0
    assert data["demo"] is True


def test_channel_not_found(client):
    resp = client.get("/api/channels/nonexistent_channel_id/stats")
    assert resp.status_code == 404
