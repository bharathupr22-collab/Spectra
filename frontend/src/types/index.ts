export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user?: User;
}

export interface Channel {
  channel_id: string;
  title: string;
  handle: string;
  description: string;
  subscriber_count: number;
  view_count: number;
  video_count: number;
  thumbnail_url: string;
  custom_url: string;
  demo?: boolean;
}

export interface ChannelStats {
  channel_id: string;
  subscriber_count: number;
  view_count: number;
  video_count: number;
  avg_views_per_video: number;
  demo?: boolean;
}

export interface Video {
  video_id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  published_at: string | null;
  duration: string;
  demo?: boolean;
}

export interface PaginatedVideos {
  videos: Video[];
  page: number;
  page_size: number;
  total: number;
  demo?: boolean;
}

export interface GrowthSnapshot {
  id?: number;
  snapshot_date: string;
  subscriber_count: number;
  view_count: number;
  video_count: number;
  demo?: boolean;
}

export interface GrowthChanges {
  daily_change: {
    subscribers: number;
    views: number;
  } | null;
  weekly_change: {
    subscribers: number;
    views: number;
  } | null;
  demo?: boolean;
}

export interface GrowthHistoryResponse {
  snapshots: GrowthSnapshot[];
  demo?: boolean;
}

export interface LinkCheckResult {
  url: string;
  status_code: number | null;
  result: 'working' | 'broken' | 'unverified' | 'suspicious';
  redirect_chain: string;
  response_time_ms: number | null;
  video_title?: string;
  checked_at?: string;
  demo?: boolean;
}

export interface LinkSummary {
  total: number;
  working: number;
  broken: number;
  unverified: number;
  suspicious: number;
  demo?: boolean;
}

export interface LipSyncResult {
  video_id: string;
  offset_ms: number | null;
  confidence: number | null;
  status: 'in_sync' | 'drift_detected' | 'not_measured';
  measured_at?: string | null;
  demo?: boolean;
}

export interface LipSyncFileResult {
  offset_ms: number;
  confidence: number;
  status: 'in_sync' | 'drift_detected';
  is_demo: boolean;
  message: string;
  filename?: string;
  content_type?: string;
}

export interface GoogleStatus {
  connected: boolean;
  email: string | null;
  connected_at: string | null;
}

export interface SettingsStatus {
  api_key_configured: boolean;
  google_connected: boolean;
  channel_connected: boolean;
  demo_mode: boolean;
}
