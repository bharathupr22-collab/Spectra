'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TrendingUp, Calendar, Users, Eye, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { GrowthChart } from '@/components/charts/GrowthChart';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { DemoBadge } from '@/components/features/DemoBadge';
import { searchChannel, getGrowthHistory, getGrowthChanges } from '@/lib/api';
import { formatNumber, formatChange } from '@/lib/utils';
import type { Channel, GrowthSnapshot, GrowthChanges } from '@/types';

function GrowthContent() {
  const searchParams = useSearchParams();
  const channelQuery = searchParams.get('channel') || 'demo';

  const [channel, setChannel] = useState<Channel | null>(null);
  const [snapshots, setSnapshots] = useState<GrowthSnapshot[]>([]);
  const [changes, setChanges] = useState<GrowthChanges | null>(null);
  const [days, setDays] = useState(28);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  const loadGrowthData = useCallback(async (query: string, historyDays: number) => {
    try {
      setLoading(true);
      const ch = await searchChannel(query);
      setChannel(ch);
      setIsDemo(!!ch.demo);

      const [histRes, changesRes] = await Promise.all([
        getGrowthHistory(ch.channel_id, historyDays).catch(() => ({ snapshots: [], demo: false })),
        getGrowthChanges(ch.channel_id).catch(() => ({ daily_change: null, weekly_change: null, demo: false })),
      ]);

      setSnapshots(histRes.snapshots || []);
      setChanges(changesRes);
      if (histRes.demo || changesRes.demo) {
        setIsDemo(true);
      }
    } catch (err) {
      console.error('Failed to load growth data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGrowthData(channelQuery, days);
  }, [channelQuery, days, loadGrowthData]);

  const dailySubs = changes?.daily_change?.subscribers ?? 0;
  const dailyViews = changes?.daily_change?.views ?? 0;
  const weeklySubs = changes?.weekly_change?.subscribers ?? 0;
  const weeklyViews = changes?.weekly_change?.views ?? 0;

  return (
    <DashboardLayout title="Growth Analysis">
      <div className="flex flex-col gap-6">
        {isDemo && (
          <DemoBadge message="Demo Data — Simulated daily snapshots. In live mode, Spectra records one authentic snapshot per channel per day." />
        )}

        {/* Channel & Controls Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-[#dfe3e8] bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Selected Channel
            </span>
            <h2 className="text-xl font-bold text-[#111827] dark:text-white">
              {channel?.title || 'Loading...'} ({channel?.handle || ''})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Time Range:</span>
            {[7, 14, 28, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  days === d
                    ? 'bg-[#111827] text-white dark:bg-white dark:text-[#111827]'
                    : 'border border-[#dfe3e8] bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
        </div>

        {/* Change Cards Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Daily Subs */}
          <Card className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Daily Subscribers</span>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-bold ${dailySubs >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {changes?.daily_change ? formatChange(dailySubs) : '—'}
              </span>
              {changes?.daily_change && (
                dailySubs >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                )
              )}
            </div>
            <span className="text-[11px] text-gray-400">vs yesterday's snapshot</span>
          </Card>

          {/* Daily Views */}
          <Card className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Daily Views</span>
              <Eye className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-bold ${dailyViews >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {changes?.daily_change ? formatChange(dailyViews) : '—'}
              </span>
              {changes?.daily_change && (
                dailyViews >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                )
              )}
            </div>
            <span className="text-[11px] text-gray-400">vs yesterday's snapshot</span>
          </Card>

          {/* Weekly Subs */}
          <Card className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Weekly Subscribers</span>
              <Calendar className="h-4 w-4 text-purple-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-bold ${weeklySubs >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {changes?.weekly_change ? formatChange(weeklySubs) : '—'}
              </span>
              {changes?.weekly_change && (
                weeklySubs >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                )
              )}
            </div>
            <span className="text-[11px] text-gray-400">7-day delta</span>
          </Card>

          {/* Weekly Views */}
          <Card className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Weekly Views</span>
              <TrendingUp className="h-4 w-4 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-bold ${weeklyViews >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {changes?.weekly_change ? formatChange(weeklyViews) : '—'}
              </span>
              {changes?.weekly_change && (
                weeklyViews >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                )
              )}
            </div>
            <span className="text-[11px] text-gray-400">7-day delta</span>
          </Card>
        </div>

        {/* Growth Chart */}
        {loading ? (
          <div className="flex h-72 items-center justify-center rounded-xl bg-white dark:bg-gray-800">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <GrowthChart snapshots={snapshots} />
        )}
      </div>
    </DashboardLayout>
  );
}

export default function GrowthPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout title="Growth Analysis">
          <div className="flex h-96 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </DashboardLayout>
      }
    >
      <GrowthContent />
    </Suspense>
  );
}
