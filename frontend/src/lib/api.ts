import type {
  AuthResponse,
  Channel,
  ChannelStats,
  PaginatedVideos,
  Video,
  GrowthChanges,
  GrowthHistoryResponse,
  LinkSummary,
  LinkCheckResult,
  LipSyncResult,
  LipSyncFileResult,
  GoogleStatus,
  SettingsStatus,
  User,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = (body as Record<string, string>).detail || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

async function requestFormData<T>(path: string, formData: FormData): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: HeadersInit = {
    ...getAuthHeaders(),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = (body as Record<string, string>).detail || `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export async function signup(name: string, email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe(): Promise<User> {
  return request<User>('/auth/me');
}

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------
export async function searchChannel(query: string): Promise<Channel> {
  return request<Channel>(`/channels/search?q=${encodeURIComponent(query)}`);
}

export async function getChannelStats(channelId: string): Promise<ChannelStats> {
  return request<ChannelStats>(`/channels/${encodeURIComponent(channelId)}/stats`);
}

export async function getChannelVideos(
  channelId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<PaginatedVideos> {
  return request<PaginatedVideos>(
    `/channels/${encodeURIComponent(channelId)}/videos?page=${page}&page_size=${pageSize}`
  );
}

export async function getTopVideo(channelId: string): Promise<Video> {
  return request<Video>(`/channels/${encodeURIComponent(channelId)}/top-video`);
}

export async function refreshChannel(channelId: string): Promise<{ message: string; videos_count?: number; demo?: boolean }> {
  return request<{ message: string; videos_count?: number; demo?: boolean }>(
    `/channels/${encodeURIComponent(channelId)}/refresh`,
    { method: 'POST' }
  );
}

// ---------------------------------------------------------------------------
// Growth
// ---------------------------------------------------------------------------
export async function getGrowthHistory(channelId: string, days: number = 28): Promise<GrowthHistoryResponse> {
  return request<GrowthHistoryResponse>(`/growth/${encodeURIComponent(channelId)}/history?days=${days}`);
}

export async function getGrowthChanges(channelId: string): Promise<GrowthChanges> {
  return request<GrowthChanges>(`/growth/${encodeURIComponent(channelId)}/changes`);
}

export async function takeGrowthSnapshot(channelId: string): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>(`/growth/${encodeURIComponent(channelId)}/snapshot`, {
    method: 'POST',
  });
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------
export async function scanLinks(channelId: string): Promise<LinkSummary & { channel_id: string }> {
  return request<LinkSummary & { channel_id: string }>(`/links/${encodeURIComponent(channelId)}/scan`, {
    method: 'POST',
  });
}

export async function getLinkResults(channelId: string): Promise<{ results: LinkCheckResult[]; demo?: boolean }> {
  return request<{ results: LinkCheckResult[]; demo?: boolean }>(`/links/${encodeURIComponent(channelId)}/results`);
}

export async function getLinkSummary(channelId: string): Promise<LinkSummary> {
  return request<LinkSummary>(`/links/${encodeURIComponent(channelId)}/summary`);
}

// ---------------------------------------------------------------------------
// Lip-Sync
// ---------------------------------------------------------------------------
export async function analyzeLipSync(channelId: string): Promise<{ results: LipSyncResult[]; demo?: boolean }> {
  return request<{ results: LipSyncResult[]; demo?: boolean }>(`/lipsync/${encodeURIComponent(channelId)}/analyze`, {
    method: 'POST',
  });
}

export async function getLipSyncResults(channelId: string): Promise<{ results: LipSyncResult[]; demo?: boolean }> {
  return request<{ results: LipSyncResult[]; demo?: boolean }>(`/lipsync/${encodeURIComponent(channelId)}/results`);
}

export async function testLipSyncFile(file: File): Promise<LipSyncFileResult> {
  const formData = new FormData();
  formData.append('file', file);
  return requestFormData<LipSyncFileResult>('/lipsync/file-test', formData);
}

// ---------------------------------------------------------------------------
// Google Auth
// ---------------------------------------------------------------------------
export async function getGoogleAuthUrl(): Promise<{ url: string }> {
  return request<{ url: string }>('/google/auth-url');
}

export async function getGoogleStatus(): Promise<GoogleStatus> {
  return request<GoogleStatus>('/google/status');
}

export async function disconnectGoogle(): Promise<{ message: string }> {
  return request<{ message: string }>('/google/disconnect', { method: 'POST' });
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
export async function getSettingsStatus(): Promise<SettingsStatus> {
  return request<SettingsStatus>('/settings/status');
}
