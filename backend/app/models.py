"""Database models for Spectra."""

from datetime import datetime, date

from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, Date,
    ForeignKey, UniqueConstraint, BigInteger,
)
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    channels = relationship("Channel", back_populates="user")
    google_connection = relationship("GoogleConnection", back_populates="user", uselist=False)


class Channel(Base):
    __tablename__ = "channels"

    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(String(255), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=True)
    handle = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    subscriber_count = Column(BigInteger, nullable=True)
    view_count = Column(BigInteger, nullable=True)
    video_count = Column(Integer, nullable=True)
    thumbnail_url = Column(Text, nullable=True)
    custom_url = Column(String(255), nullable=True)
    last_fetched = Column(DateTime, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    user = relationship("User", back_populates="channels")
    videos = relationship("Video", back_populates="channel", cascade="all, delete-orphan")
    growth_snapshots = relationship("GrowthSnapshot", back_populates="channel", cascade="all, delete-orphan")
    link_check_results = relationship("LinkCheckResult", back_populates="channel", cascade="all, delete-orphan")


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(String(255), unique=True, nullable=False, index=True)
    channel_id = Column(Integer, ForeignKey("channels.id"), nullable=False)
    title = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    thumbnail_url = Column(Text, nullable=True)
    view_count = Column(BigInteger, nullable=True)
    like_count = Column(BigInteger, nullable=True)
    comment_count = Column(BigInteger, nullable=True)
    published_at = Column(DateTime, nullable=True)
    duration = Column(String(50), nullable=True)

    channel = relationship("Channel", back_populates="videos")
    link_check_results = relationship("LinkCheckResult", back_populates="video", cascade="all, delete-orphan")
    lipsync_results = relationship("LipSyncResult", back_populates="video", cascade="all, delete-orphan")


class GrowthSnapshot(Base):
    __tablename__ = "growth_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(Integer, ForeignKey("channels.id"), nullable=False)
    subscriber_count = Column(BigInteger, nullable=True)
    view_count = Column(BigInteger, nullable=True)
    video_count = Column(Integer, nullable=True)
    snapshot_date = Column(Date, nullable=False, default=date.today)

    channel = relationship("Channel", back_populates="growth_snapshots")

    __table_args__ = (
        UniqueConstraint("channel_id", "snapshot_date", name="uq_channel_snapshot_date"),
    )


class LinkCheckResult(Base):
    __tablename__ = "link_check_results"

    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(Integer, ForeignKey("channels.id"), nullable=False)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    url = Column(Text, nullable=False)
    status_code = Column(Integer, nullable=True)
    result = Column(String(50), nullable=False)  # working / broken / unverified / suspicious
    redirect_chain = Column(Text, nullable=True)  # JSON string
    response_time_ms = Column(Float, nullable=True)
    checked_at = Column(DateTime, default=datetime.utcnow)

    channel = relationship("Channel", back_populates="link_check_results")
    video = relationship("Video", back_populates="link_check_results")


class LipSyncResult(Base):
    __tablename__ = "lipsync_results"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    offset_ms = Column(Float, nullable=True)
    confidence = Column(Float, nullable=True)
    status = Column(String(50), nullable=False)  # in_sync / drift_detected / not_measured
    measured_at = Column(DateTime, default=datetime.utcnow)

    video = relationship("Video", back_populates="lipsync_results")


class GoogleConnection(Base):
    __tablename__ = "google_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    access_token_encrypted = Column(Text, nullable=False)
    refresh_token_encrypted = Column(Text, nullable=False)
    token_expiry = Column(DateTime, nullable=True)
    scopes = Column(Text, nullable=True)
    connected_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="google_connection")
