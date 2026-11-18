'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Link2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Play,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { LinkDonutChart } from '@/components/charts/LinkDonutChart';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { DemoBadge } from '@/components/features/DemoBadge';
import { searchChannel, scanLinks, getLinkResults, getLinkSummary } from '@/lib/api';
import type { Channel, LinkSummary, LinkCheckResult } from '@/types';

function LinksContent() {
  const searchParams = useSearchParams();
  const channelQuery = searchParams.get('channel') || 'demo';

  const [channel, setChannel] = useState<Channel | null>(null);
  const [summary, setSummary] = useState<LinkSummary>({
    total: 0,
    working: 0,
    broken: 0,
    unverified: 0,
    suspicious: 0,
  });
  const [results, setResults] = useState<LinkCheckResult[]>([]);
  const [filter, setFilter] = useState<'all' | 'working' | 'broken' | 'unverified' | 'suspicious'>('all');
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  const loadLinkData = useCallback(async (query: string) => {
    try {
      setLoading(true);
      const ch = await searchChannel(query);
      setChannel(ch);
      setIsDemo(!!ch.demo);

      const [sumRes, resList] = await Promise.all([
        getLinkSummary(ch.channel_id).catch(() => ({ total: 0, working: 0, broken: 0, unverified: 0, suspicious: 0, demo: false })),
        getLinkResults(ch.channel_id).catch(() => ({ results: [], demo: false })),
      ]);

      setSummary(sumRes);
      setResults(resList.results || []);
      if (sumRes.demo || resList.demo) {
        setIsDemo(true);
      }
    } catch (err) {
      console.error('Failed to load link data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLinkData(channelQuery);
  }, [channelQuery, loadLinkData]);

  const handleStartScan = async () => {
    if (!channel) return;
    try {
      setIsScanning(true);
      const scanRes = await scanLinks(channel.channel_id);
      setSummary(scanRes);
      const updated = await getLinkResults(channel.channel_id);
      setResults(updated.results || []);
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const filteredResults = results.filter((r) => {
    if (filter === 'all') return true;
    return r.result === filter;
  });

  const getResultBadge = (result: LinkCheckResult['result']) => {
    switch (result) {
      case 'working':
        return <Badge variant="green">Working</Badge>;
      case 'broken':
        return <Badge variant="red">Broken</Badge>;
      case 'unverified':
        return <Badge variant="yellow">Unverified</Badge>;
      case 'suspicious':
        return <Badge variant="orange">Suspicious (SSRF)</Badge>;
      default:
        return <Badge variant="gray">{result}</Badge>;
    }
  };

  return (
    <DashboardLayout title="Broken Link Analyzer">
      <div className="flex flex-col gap-6">
        {isDemo && (
          <DemoBadge message="Demo Data — Simulated link scan. Live scan extracts bare links (amzn.in, youtu.be, linktr.ee) from all video descriptions and checks HTTP reachability." />
        )}

        {/* Scan Action Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-[#dfe3e8] bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Description Link Scanner
            </span>
            <h2 className="text-xl font-bold text-[#111827] dark:text-white">
              {channel?.title || 'Loading...'} ({channel?.handle || ''})
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              NLP Tokenizer + Classifier extracts full & bare URLs, checking live HTTP codes with SSRF defense.
            </p>
          </div>

          <button
            onClick={handleStartScan}
            disabled={isScanning || !channel}
            className="inline-flex items-center gap-2 rounded-xl bg-[#111827] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-[#111827] dark:hover:bg-gray-100"
          >
            {isScanning ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Scanning All Descriptions...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Run Description Scan</span>
              </>
            )}
          </button>
        </div>

        {/* Counters Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Extracted Links"
            value={summary.total.toString()}
            icon={<Link2 className="h-5 w-5 text-blue-500" />}
          />
          <StatCard
            label="Working Links (2xx–3xx)"
            value={summary.working.toString()}
            icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
          />
          <StatCard
            label="Broken Links (404/DNS)"
            value={summary.broken.toString()}
            icon={<XCircle className="h-5 w-5 text-red-500" />}
          />
          <StatCard
            label="Unverified / Blocked"
            value={summary.unverified.toString()}
            icon={<HelpCircle className="h-5 w-5 text-amber-500" />}
          />
        </div>

        {/* Donut Chart & Breakdown */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <LinkDonutChart summary={summary} />
          </div>

          <div className="lg:col-span-2">
            <Card className="flex flex-col gap-4">
              <div className="border-b border-gray-100 pb-3 dark:border-gray-700">
                <h3 className="text-base font-semibold text-[#111827] dark:text-white">
                  Extraction & Audit Standards
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Strict classification criteria per Spectra engineering rules
                </p>
              </div>
              <div className="grid gap-3 text-xs">
                <div className="flex items-start gap-2.5 p-2 rounded bg-green-50/60 dark:bg-green-950/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-green-900 dark:text-green-300">Working (2xx–3xx):</span>
                    <span className="text-green-800 dark:text-green-400 ml-1">Destination returned successful response code after following all redirects (up to 5 hops).</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-2 rounded bg-red-50/60 dark:bg-red-950/20">
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-red-900 dark:text-red-300">Broken (404/410/DNS failure):</span>
                    <span className="text-red-800 dark:text-red-400 ml-1">Target resource does not exist or domain failed DNS resolution.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-2 rounded bg-amber-50/60 dark:bg-amber-950/20">
                  <HelpCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-900 dark:text-amber-300">Unverified (401/403/429, 5xx, timeout):</span>
                    <span className="text-amber-800 dark:text-amber-400 ml-1">Bot-blocked or unreachable is NOT broken — never guessed as dead.</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-2 rounded bg-orange-50/60 dark:bg-orange-950/20">
                  <ShieldAlert className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-orange-900 dark:text-orange-300">Suspicious (SSRF Blocked):</span>
                    <span className="text-orange-800 dark:text-orange-400 ml-1">Protected against internal/private IP ranges (RFC 1918, loopback, link-local).</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Results Table with Filter Tabs */}
        <Card className="flex flex-col gap-4 overflow-hidden p-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#dfe3e8] px-6 py-4 gap-3 dark:border-gray-700">
            <div>
              <h3 className="text-base font-semibold text-[#111827] dark:text-white">
                Discovered Links Log
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                All URLs extracted from video descriptions
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#f3f4f6] p-1 dark:bg-gray-800">
              {(['all', 'working', 'broken', 'unverified'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition-all ${
                    filter === tab
                      ? 'bg-white text-[#111827] shadow-sm dark:bg-gray-700 dark:text-white'
                      : 'text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f3f4f6] text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800/80 dark:text-gray-400">
                <tr>
                  <th className="py-3 px-6">URL</th>
                  <th className="py-3 px-4">Source Video</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Result</th>
                  <th className="py-3 px-4">Response Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dfe3e8] dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center">
                      <LoadingSpinner size="md" />
                    </td>
                  </tr>
                ) : filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
                      No links matching the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((item, index) => (
                    <tr
                      key={`${item.url}-${index}`}
                      className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-700/40"
                    >
                      <td className="py-3.5 px-6 max-w-xs truncate">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs font-medium text-blue-600 hover:underline inline-flex items-center gap-1 dark:text-blue-400"
                        >
                          <span className="truncate">{item.url}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-gray-700 dark:text-gray-300 max-w-xs truncate">
                        {item.video_title || 'Description'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-gray-600 dark:text-gray-400">
                        {item.status_code ? (
                          <span className="font-semibold">{item.status_code}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {getResultBadge(item.result)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-gray-500 dark:text-gray-400">
                        {item.response_time_ms ? `${item.response_time_ms} ms` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default function LinksPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout title="Broken Link Analyzer">
          <div className="flex h-96 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </DashboardLayout>
      }
    >
      <LinksContent />
    </Suspense>
  );
}
