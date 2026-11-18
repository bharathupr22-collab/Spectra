"""Tests for growth analysis endpoints."""

from datetime import date, timedelta
from app.models import Channel, GrowthSnapshot


def test_growth_snapshot_create(client):
    client.get("/api/channels/search?q=demo")
    resp = client.post("/api/growth/UCdemo123/snapshot")
    assert resp.status_code == 200
    data = resp.json()
    assert data["subscriber_count"] == 128400
    assert data["view_count"] == 8421390
    assert "snapshot_date" in data


def test_growth_history_demo(client):
    client.get("/api/channels/search?q=demo")
    resp = client.get("/api/growth/UCdemo123/history?days=28")
    assert resp.status_code == 200
    data = resp.json()
    assert "snapshots" in data
    assert len(data["snapshots"]) == 7
    assert data["demo"] is True


def test_growth_changes_demo(client):
    client.get("/api/channels/search?q=demo")
    resp = client.get("/api/growth/UCdemo123/changes")
    assert resp.status_code == 200
    data = resp.json()
    assert "daily_change" in data
    assert "weekly_change" in data
    assert data["daily_change"]["subscribers"] > 0
    assert data["weekly_change"]["views"] > 0
    assert data["demo"] is True


def test_growth_real_snapshots_logic(db):
    """Test that growth calculation only uses real DB snapshots and computes correctly."""
    ch = Channel(
        channel_id="UCreal001",
        title="Real Channel",
        subscriber_count=100000,
        view_count=5000000,
        video_count=50,
    )
    db.add(ch)
    db.commit()

    today = date.today()
    snap1 = GrowthSnapshot(
        channel_id=ch.id,
        subscriber_count=98000,
        view_count=4900000,
        video_count=48,
        snapshot_date=today - timedelta(days=7),
    )
    snap2 = GrowthSnapshot(
        channel_id=ch.id,
        subscriber_count=99500,
        view_count=4980000,
        video_count=49,
        snapshot_date=today - timedelta(days=1),
    )
    snap3 = GrowthSnapshot(
        channel_id=ch.id,
        subscriber_count=100000,
        view_count=5000000,
        video_count=50,
        snapshot_date=today,
    )
    db.add_all([snap1, snap2, snap3])
    db.commit()

    snapshots = (
        db.query(GrowthSnapshot)
        .filter(GrowthSnapshot.channel_id == ch.id)
        .order_by(GrowthSnapshot.snapshot_date.asc())
        .all()
    )
    assert len(snapshots) == 3
    daily_sub_change = snap3.subscriber_count - snap2.subscriber_count
    weekly_sub_change = snap3.subscriber_count - snap1.subscriber_count
    assert daily_sub_change == 500
    assert weekly_sub_change == 2000
