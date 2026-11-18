'use client';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import type { LinkSummary } from '@/types';

interface LinkDonutChartProps {
  summary: LinkSummary;
}

const COLORS: Record<string, string> = {
  Working: '#22c55e',
  Broken: '#ef4444',
  Unverified: '#eab308',
  Suspicious: '#f97316',
};

export function LinkDonutChart({ summary }: LinkDonutChartProps) {
  const data = [
    { name: 'Working', value: summary.working },
    { name: 'Broken', value: summary.broken },
    { name: 'Unverified', value: summary.unverified },
    ...(summary.suspicious ? [{ name: 'Suspicious', value: summary.suspicious }] : []),
  ].filter((item) => item.value > 0);

  return (
    <Card className="flex flex-col gap-4">
      <div className="border-b border-gray-100 pb-3 dark:border-gray-700">
        <h3 className="text-base font-semibold text-[#111827] dark:text-white">
          Link Health Ratio
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Proportion of functional vs dead links
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="relative h-48 w-48 shrink-0">
          {summary.total === 0 ? (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
              No links scanned
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {data.map((entry) => (
                      <Cell key={entry.name} fill={COLORS[entry.name] || '#9ca3af'} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0];
                        return (
                          <div className="rounded border border-gray-200 bg-white px-2.5 py-1 text-xs shadow dark:border-gray-700 dark:bg-gray-800">
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                              {item.name}:
                            </span>{' '}
                            <span>{item.value}</span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-[#111827] dark:text-white">
                  {summary.total}
                </span>
                <span className="text-[10px] uppercase font-semibold text-gray-400">
                  Total Links
                </span>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-2.5 w-full">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-gray-600 dark:text-gray-300">Working (2xx-3xx)</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">{summary.working}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-gray-600 dark:text-gray-300">Broken (404/DNS)</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">{summary.broken}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-500" />
              <span className="text-gray-600 dark:text-gray-300">Unverified (Bot-blocked/5xx)</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">{summary.unverified}</span>
          </div>

          {summary.suspicious > 0 && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-orange-500" />
                <span className="text-gray-600 dark:text-gray-300">Suspicious (SSRF Blocked)</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">{summary.suspicious}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
