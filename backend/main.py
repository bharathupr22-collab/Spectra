"""Spectra Backend — FastAPI application entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import auth, channels, growth, links, lipsync, google_auth, settings as settings_router

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Spectra API",
    description="YouTube channel analytics API",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(channels.router, prefix="/api/channels", tags=["Channels"])
app.include_router(growth.router, prefix="/api/growth", tags=["Growth"])
app.include_router(links.router, prefix="/api/links", tags=["Links"])
app.include_router(lipsync.router, prefix="/api/lipsync", tags=["Lip-Sync"])
app.include_router(google_auth.router, prefix="/api/google", tags=["Google Auth"])
app.include_router(settings_router.router, prefix="/api/settings", tags=["Settings"])


@app.get("/")
def root():
    return {"message": "Spectra API is running", "docs": "/docs"}
