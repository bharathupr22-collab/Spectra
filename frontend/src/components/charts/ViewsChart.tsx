'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { formatNumber } from '@/lib/utils';
import type { Video } from '@/types';

interface ViewsChartProps {
  videos: Video[];
}

export function ViewsChart({ videos }: ViewsChartProps) {
  // Format data from videos in chronological order (oldest to newest for trajectory)
  const chartData = [...videos]
    .slice(0, 15)
    .reverse()
    .map((v, i) => {
      const label = v.published_at
        ? new Date(v.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : `V${i + 1}`;
      return {
        name: label,
        title: v.title,
        views: v.view_count,
        likes: v.like_count,
      };
    });

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
        <div>
          <h3 className="text-base font-semibold text-[#111827] dark:text-white">
            Views Velocity & Performance
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            View distribution across recent uploads
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
            <span className="text-gray-600 dark:text-gray-300">Views</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            No video data available to chart
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" className="dark:stroke-gray-700/50" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#888' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#888' }}
                tickFormatter={(val) => formatNumber(val)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md dark:border-gray-700 dark:bg-gray-800">
                        <p className="line-clamp-1 max-w-xs text-xs font-semibold text-gray-900 dark:text-white">
                          {data.title}
                        </p>
                        <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-bold">
                          {formatNumber(data.views)} views
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="views"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#viewsGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
