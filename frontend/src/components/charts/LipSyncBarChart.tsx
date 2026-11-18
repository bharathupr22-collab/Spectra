'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import type { LipSyncResult } from '@/types';

interface LipSyncBarChartProps {
  results: LipSyncResult[];
}

export function LipSyncBarChart({ results }: LipSyncBarChartProps) {
  const measured = results.filter((r) => r.offset_ms !== null);

  const chartData = measured.slice(0, 10).map((r, i) => ({
    name: `Video ${i + 1}`,
    offset: Math.round(r.offset_ms || 0),
    status: r.status,
  }));

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
        <div>
          <h3 className="text-base font-semibold text-[#111827] dark:text-white">
            Audio-Video Sync Offset (ms)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Threshold: 45 ms (Red line). Offsets above 45 ms indicate lip-sync drift.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="text-gray-700 dark:text-gray-300">≤ 45ms In Sync</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="text-gray-700 dark:text-gray-300">&gt; 45ms Drift</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            No measured offset data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <XAxis
                type="number"
                domain={[0, (dataMax: number) => Math.max(60, dataMax + 10)]}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#888' }}
                unit=" ms"
              />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#888' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded border border-gray-200 bg-white p-2.5 text-xs shadow dark:border-gray-700 dark:bg-gray-800">
                        <p className="font-semibold text-gray-900 dark:text-white">{data.name}</p>
                        <p className="mt-1">
                          Offset:{' '}
                          <span
                            className={
                              data.offset > 45
                                ? 'font-bold text-red-600 dark:text-red-400'
                                : 'font-bold text-green-600 dark:text-green-400'
                            }
                          >
                            {data.offset} ms ({data.status === 'in_sync' ? 'In Sync' : 'Drift Detected'})
                          </span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine
                x={45}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: '45ms Limit',
                  position: 'top',
                  fill: '#ef4444',
                  fontSize: 10,
                }}
              />
              <Bar dataKey="offset" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.offset > 45 ? '#ef4444' : '#22c55e'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
