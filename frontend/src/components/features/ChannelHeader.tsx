'use client';

import { useState } from 'react';
import { RefreshCw, Users, Eye, Video as VideoIcon, ExternalLink } from 'lucide-react';
import type { Channel } from '@/types';
import { formatNumber } from '@/lib/utils';
import { DemoBadge } from './DemoBadge';
import { refreshChannel } from '@/lib/api';

interface ChannelHeaderProps {
  channel: Channel;
  onRefresh?: () => void;
}

export function ChannelHeader({ channel, onRefresh }: ChannelHeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refreshChannel(channel.channel_id);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error('Refresh failed:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const channelUrl = channel.handle
    ? `https://youtube.com/${channel.handle.startsWith('@') ? channel.handle : '@' + channel.handle}`
    : `https://youtube.com/channel/${channel.channel_id}`;

  return (
    <div className="flex flex-col gap-4">
      {channel.demo && (
        <DemoBadge message="Demo Data — You are viewing simulated metrics for @spectra_demo. Configure your YOUTUBE_API_KEY in backend/.env for live channels." />
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-[#dfe3e8] bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-4">
          {channel.thumbnail_url ? (
            <img
              src={channel.thumbnail_url}
              alt={channel.title}
              className="h-16 w-16 rounded-full border border-gray-200 object-cover dark:border-gray-700"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#111827] text-xl font-bold text-white dark:bg-gray-700 dark:text-gray-100">
              {channel.title ? channel.title.charAt(0).toUpperCase() : 'C'}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#111827] dark:text-white">
                {channel.title || 'YouTube Channel'}
              </h2>
              <a
                href={channelUrl}
                target="_blank"
                rel="noreferrer"
                className="text-gray-400 hover:text-blue-500 transition-colors"
                title="Open on YouTube"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {channel.handle || `@${channel.channel_id}`}
            </p>
            {channel.description && (
              <p className="mt-1 line-clamp-1 max-w-xl text-xs text-gray-400 dark:text-gray-500">
                {channel.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-[#dfe3e8] bg-white px-3.5 py-2 text-xs font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Scanning...' : 'Refresh'}
          </button>
        </div>
      </div>
    </div>
  );
}
