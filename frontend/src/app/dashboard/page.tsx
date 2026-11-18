'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Users, Eye, Video as VideoIcon, BarChart2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ChannelHeader } from '@/components/features/ChannelHeader';
import { StatCard } from '@/components/ui/StatCard';
import { ViewsChart } from '@/components/charts/ViewsChart';
import { TopVideoCard } from '@/components/features/TopVideoCard';
import { VideoTable } from '@/components/features/VideoTable';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  searchChannel,
  getChannelStats,
  getChannelVideos,
  getTopVideo,
  takeGrowthSnapshot,
} from '@/lib/api';
import { formatNumber, formatNumberWithCommas } from '@/lib/utils';
import type { Channel, ChannelStats, Video } from '@/types';

function DashboardContent() {
  const searchParams = useSearchParams();
  const channelQuery = searchParams.get('channel') || 'demo';

  const [channel, setChannel] = useState<Channel | null>(null);
  const [stats, setStats] = useState<ChannelStats | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [topVideo, setTopVideo] = useState<Video | null>(null);
  const [page, setPage] = useState(1);
  const [totalVideos, setTotalVideos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pageSize = 10;

  const loadChannelData = useCallback(async (query: string, pageNum: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      // 1. Resolve channel
      const ch = await searchChannel(query);
      setChannel(ch);

      // 2. Fetch stats, top video, and videos in parallel
      const [st, vidsRes, topVid] = await Promise.all([
        getChannelStats(ch.channel_id).catch(() => null),
        getChannelVideos(ch.channel_id, pageNum, pageSize).catch(() => null),
        getTopVideo(ch.channel_id).catch(() => null),
      ]);

      if (st) setStats(st);
      if (topVid) setTopVideo(topVid);
      if (vidsRes) {
        setVideos(vidsRes.videos);
        setTotalVideos(vidsRes.total);
      }

      // Record daily snapshot for growth history
      takeGrowthSnapshot(ch.channel_id).catch(() => {});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load channel data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChannelData(channelQuery, page);
  }, [channelQuery, page, loadChannelData]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  if (loading && !channel) {
    return (
      <DashboardLayout title="Channel Dashboard">
        <div className="flex h-96 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !channel) {
    return (
      <DashboardLayout title="Channel Dashboard">
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-900/50 dark:bg-gray-800">
          <h3 className="text-lg font-bold text-red-600 dark:text-red-400">
            Channel Resolution Error
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {error || 'Could not find channel. Please verify the handle and try again.'}
          </p>
          <button
            onClick={() => loadChannelData('demo', 1)}
            className="mt-4 rounded-lg bg-[#111827] px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-[#111827]"
          >
            Load Demo Channel
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const subCount = stats?.subscriber_count ?? channel.subscriber_count ?? 0;
  const viewCount = stats?.view_count ?? channel.view_count ?? 0;
  const videoCount = stats?.video_count ?? channel.video_count ?? 0;
  const avgViews = stats?.avg_views_per_video ?? (videoCount > 0 ? Math.floor(viewCount / videoCount) : 0);

  return (
    <DashboardLayout title="Channel Dashboard">
      <div className="flex flex-col gap-6">
        {/* Channel Overview Header */}
        <ChannelHeader channel={channel} onRefresh={() => loadChannelData(channelQuery, page)} />

        {/* Big Stat Numbers Row (Reference Dashboard style) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Subscribers"
            value={formatNumber(subCount)}
            icon={<Users className="h-5 w-5 text-blue-500" />}
          />
          <StatCard
            label="Lifetime Views"
            value={formatNumber(viewCount)}
            icon={<Eye className="h-5 w-5 text-emerald-500" />}
          />
          <StatCard
            label="Total Videos Uploaded"
            value={formatNumberWithCommas(videoCount)}
            icon={<VideoIcon className="h-5 w-5 text-purple-500" />}
          />
          <StatCard
            label="Average Views / Video"
            value={formatNumber(avgViews)}
            icon={<BarChart2 className="h-5 w-5 text-amber-500" />}
          />
        </div>

        {/* Middle Row: Views Chart & Featured Top Video */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ViewsChart videos={videos} />
          </div>
          <div>
            <TopVideoCard video={topVideo} />
          </div>
        </div>

        {/* Bottom Section: Full Paginated Video List */}
        <div>
          <VideoTable
            videos={videos}
            page={page}
            pageSize={pageSize}
            total={totalVideos}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout title="Channel Dashboard">
          <div className="flex h-96 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </DashboardLayout>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
