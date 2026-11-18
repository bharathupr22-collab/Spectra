'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Settings as SettingsIcon,
  Key,
  Shield,
  Radio,
  ExternalLink,
  CheckCircle,
  XCircle,
  Search,
  Lock,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  getSettingsStatus,
  getGoogleStatus,
  getGoogleAuthUrl,
  disconnectGoogle,
  searchChannel,
} from '@/lib/api';
import type { SettingsStatus, GoogleStatus, Channel } from '@/types';

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const channelParam = searchParams.get('channel') || '';

  const [settingsStatus, setSettingsStatus] = useState<SettingsStatus | null>(null);
  const [googleStatus, setGoogleStatus] = useState<GoogleStatus | null>(null);
  const [channelInput, setChannelInput] = useState(channelParam);
  const [connectedChannel, setConnectedChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [sStatus, gStatus] = await Promise.all([
        getSettingsStatus().catch(() => ({
          api_key_configured: false,
          google_connected: false,
          channel_connected: false,
          demo_mode: true,
        })),
        getGoogleStatus().catch(() => ({
          connected: false,
          email: null,
          connected_at: null,
        })),
      ]);

      setSettingsStatus(sStatus);
      setGoogleStatus(gStatus);

      if (channelParam) {
        const ch = await searchChannel(channelParam).catch(() => null);
        if (ch) setConnectedChannel(ch);
      }
    } catch (err) {
      console.error('Settings load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [channelParam]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleConnectGoogle = async () => {
    try {
      const { url } = await getGoogleAuthUrl();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error('Failed to get Google auth URL:', err);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      setDisconnecting(true);
      await disconnectGoogle();
      setGoogleStatus({ connected: false, email: null, connected_at: null });
      setMessage('Google account disconnected successfully.');
    } catch (err) {
      console.error('Failed to disconnect Google:', err);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleChannelSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelInput.trim()) return;
    router.push(`/dashboard?channel=${encodeURIComponent(channelInput.trim())}`);
  };

  return (
    <DashboardLayout title="App Settings & Connections">
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        {/* Intro */}
        <div className="rounded-xl border border-[#dfe3e8] bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#111827] text-white dark:bg-white dark:text-[#111827]">
              <SettingsIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#111827] dark:text-white">
                Configuration & Privacy Settings
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Spectra is completely open — all public channels can be analyzed without connecting Google.
              </p>
            </div>
          </div>
        </div>

        {message && (
          <div className="rounded-lg bg-green-50 p-3 text-xs text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200 dark:border-green-800">
            {message}
          </div>
        )}

        {/* 1. YouTube Data API Key Status */}
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-500" />
              <h3 className="text-base font-semibold text-[#111827] dark:text-white">
                YouTube Data API v3 Status
              </h3>
            </div>
            {settingsStatus?.api_key_configured ? (
              <Badge variant="green">API Key Configured</Badge>
            ) : (
              <Badge variant="yellow">Demo Mode Active</Badge>
            )}
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            Spectra utilizes the free Google Cloud YouTube Data API v3 (10,000 quota units/day).
            {settingsStatus?.api_key_configured ? (
              <span className="block mt-1 font-medium text-green-600 dark:text-green-400">
                Live API key is active in backend/.env. Public channel lookups and video scans pull live YouTube data.
              </span>
            ) : (
              <span className="block mt-1 text-amber-700 dark:text-amber-400">
                No YOUTUBE_API_KEY detected in backend/.env. Spectra automatically runs in demo mode using @spectra_demo. To connect real channels, provide your free API key in backend/.env.
              </span>
            )}
          </p>
        </Card>

        {/* 2. Channel Connection */}
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-purple-500" />
              <h3 className="text-base font-semibold text-[#111827] dark:text-white">
                Active Inspected Channel
              </h3>
            </div>
            {connectedChannel ? (
              <Badge variant="blue">{connectedChannel.handle || connectedChannel.title}</Badge>
            ) : (
              <Badge variant="gray">No Channel Selected</Badge>
            )}
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-300">
            Spectra is not tied to one channel. Type any public channel name or handle to switch inspection:
          </p>

          <form onSubmit={handleChannelSwitch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
                placeholder="e.g. @ApnaCollegeOfficial or channel name"
                className="w-full rounded-lg border border-[#dfe3e8] bg-white py-2 pl-9 pr-3 text-sm text-[#111827] focus:border-[#111827] focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-[#111827] px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-[#111827]"
            >
              Inspect
            </button>
          </form>
        </Card>

        {/* 3. Google Account Connection (Optional Channel Owner Connect) */}
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-500" />
              <h3 className="text-base font-semibold text-[#111827] dark:text-white">
                Channel Owner Google Connect (Optional)
              </h3>
            </div>
            {googleStatus?.connected ? (
              <Badge variant="green">Connected</Badge>
            ) : (
              <Badge variant="gray">Not Connected</Badge>
            )}
          </div>

          <div className="rounded-lg bg-blue-50/70 p-3.5 text-xs text-blue-900 dark:bg-blue-950/30 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40 flex items-start gap-2.5">
            <Lock className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
            <div>
              <span className="font-bold">Honesty &amp; Privacy Rule:</span>
              <p className="mt-0.5">
                Google sign-in is strictly an optional connect for channel OWNERS who wish to view private metrics (watch time, revenue, real-time analytics) via YouTube Analytics API. Spectra NEVER asks for anyone&apos;s Google password — authentication occurs directly on Google&apos;s servers, and tokens are encrypted with symmetric Fernet keys.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
            <div>
              {googleStatus?.connected ? (
                <div>
                  <p className="text-sm font-semibold text-[#111827] dark:text-white">
                    Connected Account: {googleStatus.email || 'Owner Google Account'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Connected since {googleStatus.connected_at ? new Date(googleStatus.connected_at).toLocaleDateString() : 'Active'}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No channel owner Google account linked.
                </p>
              )}
            </div>

            <div>
              {googleStatus?.connected ? (
                <button
                  onClick={handleDisconnectGoogle}
                  disabled={disconnecting}
                  className="rounded-lg border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-400"
                >
                  {disconnecting ? 'Disconnecting...' : 'Disconnect Google Account'}
                </button>
              ) : (
                <button
                  onClick={handleConnectGoogle}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#111827] px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-[#111827]"
                >
                  <span>Connect Google Account</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout title="App Settings">
          <div className="flex h-96 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </DashboardLayout>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
