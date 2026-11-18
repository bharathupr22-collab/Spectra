'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { formatNumber, formatDate } from '@/lib/utils';
import type { GrowthSnapshot } from '@/types';

interface GrowthChartProps {
  snapshots: GrowthSnapshot[];
}

export function GrowthChart({ snapshots }: GrowthChartProps) {
  if (!snapshots || snapshots.length < 2) {
    return (
      <Card className="flex flex-col items-center justify-center p-12 text-center">
        <div className="max-w-md">
          <h4 className="text-base font-semibold text-gray-900 dark:text-white">
            Historical Growth Tracking
          </h4>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Not enough data yet. Growth tracking starts when you first analyze a channel. Check back tomorrow for your first growth data point.
          </p>
        </div>
      </Card>
    );
  }

  const chartData = snapshots.map((s) => ({
    date: formatDate(s.snapshot_date),
    subscribers: s.subscriber_count,
    views: s.view_count,
  }));

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
        <div>
          <h3 className="text-base font-semibold text-[#111827] dark:text-white">
            Channel Growth Trajectory
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Real daily snapshots recorded in Spectra database
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
            <span className="text-gray-700 dark:text-gray-300">Subscribers (Left)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f97316]" />
            <span className="text-gray-700 dark:text-gray-300">Views (Right)</span>
          </div>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" className="dark:stroke-gray-700/50" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#888' }}
            />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#3b82f6' }}
              tickFormatter={(val) => formatNumber(val)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#f97316' }}
              tickFormatter={(val) => formatNumber(val)}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md dark:border-gray-700 dark:bg-gray-800">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">{label}</p>
                      <div className="mt-1 space-y-1">
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          Subscribers: {formatNumber(payload[0].value as number)}
                        </p>
                        {payload[1] && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                            Views: {formatNumber(payload[1].value as number)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="subscribers"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#3b82f6' }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="views"
              stroke="#f97316"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#f97316' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
