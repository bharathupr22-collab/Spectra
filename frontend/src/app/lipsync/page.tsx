'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AudioLines,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Play,
  FileVideo,
  Info,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { LipSyncBarChart } from '@/components/charts/LipSyncBarChart';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { DemoBadge } from '@/components/features/DemoBadge';
import { searchChannel, analyzeLipSync, getLipSyncResults, testLipSyncFile } from '@/lib/api';
import type { Channel, LipSyncResult, LipSyncFileResult } from '@/types';

function LipSyncContent() {
  const searchParams = useSearchParams();
  const channelQuery = searchParams.get('channel') || 'demo';

  const [channel, setChannel] = useState<Channel | null>(null);
  const [results, setResults] = useState<LipSyncResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  // File test state
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [fileResult, setFileResult] = useState<LipSyncFileResult | null>(null);
  const [isFileTesting, setIsFileTesting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const loadLipSyncData = useCallback(async (query: string) => {
    try {
      setLoading(true);
      const ch = await searchChannel(query);
      setChannel(ch);
      setIsDemo(!!ch.demo);

      const res = await getLipSyncResults(ch.channel_id).catch(() => ({ results: [], demo: false }));
      setResults(res.results || []);
      if (res.demo) {
        setIsDemo(true);
      }
    } catch (err) {
      console.error('Failed to load lip-sync data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLipSyncData(channelQuery);
  }, [channelQuery, loadLipSyncData]);

  const handleRunCheck = async () => {
    if (!channel) return;
    try {
      setIsAnalyzing(true);
      const res = await analyzeLipSync(channel.channel_id);
      setResults(res.results || []);
    } catch (err) {
      console.error('Lip sync check failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload) return;

    try {
      setIsFileTesting(true);
      setFileError(null);
      const res = await testLipSyncFile(fileToUpload);
      setFileResult(res);
    } catch (err: unknown) {
      setFileError(err instanceof Error ? err.message : 'File upload test failed');
    } finally {
      setIsFileTesting(false);
    }
  };

  // Metrics
  const measuredClips = results.filter((r) => r.offset_ms !== null);
  const inSyncCount = results.filter((r) => r.status === 'in_sync').length;
  const driftCount = results.filter((r) => r.status === 'drift_detected').length;
  const notMeasuredCount = results.filter((r) => r.status === 'not_measured').length;

  return (
    <DashboardLayout title="Lip-Sync Analyzer">
      <div className="flex flex-col gap-6">
        {isDemo && (
          <DemoBadge message="Demo Data — Simulated lip-sync metrics for @spectra_demo. For unmeasured live videos, Spectra strictly shows '—' and 'Not measured'." />
        )}

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-[#dfe3e8] bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Audio-Visual Synchronization
            </span>
            <h2 className="text-xl font-bold text-[#111827] dark:text-white">
              {channel?.title || 'Loading...'} ({channel?.handle || ''})
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Measures audio-video offset in milliseconds using SyncNet-style cross-correlation. Threshold: ≤ 45 ms.
            </p>
          </div>

          <button
            onClick={handleRunCheck}
            disabled={isAnalyzing || !channel}
            className="inline-flex items-center gap-2 rounded-xl bg-[#111827] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-[#111827] dark:hover:bg-gray-100"
          >
            {isAnalyzing ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Running Sync Inspection...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Run Lip-Sync Check</span>
              </>
            )}
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Videos Evaluated"
            value={results.length.toString()}
            icon={<AudioLines className="h-5 w-5 text-blue-500" />}
          />
          <StatCard
            label="In Sync (≤ 45 ms)"
            value={inSyncCount.toString()}
            icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
          />
          <StatCard
            label="Drift Detected (> 45 ms)"
            value={driftCount.toString()}
            icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
          />
          <StatCard
            label="Not Measured / Pending"
            value={notMeasuredCount.toString()}
            icon={<Info className="h-5 w-5 text-gray-400" />}
          />
        </div>

        {/* Bar Chart & SyncNet Explanation */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <LipSyncBarChart results={results} />
          </div>

          <div className="lg:col-span-1">
            <Card className="flex flex-col gap-4">
              <div className="border-b border-gray-100 pb-3 dark:border-gray-700">
                <h3 className="text-base font-semibold text-[#111827] dark:text-white">
                  Synchronization Standard
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Audio-visual latency classification rule
                </p>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                <div className="p-3 rounded-lg border border-[#dfe3e8] bg-[#f3f4f6] dark:border-gray-700 dark:bg-gray-800/80">
                  <span className="font-bold text-[#111827] dark:text-white">The 45 ms Threshold Rule:</span>
                  <p className="mt-1">
                    Human perception detects audio leading or lagging speech lip movements when the temporal misalignment exceeds <strong>45 milliseconds</strong>.
                  </p>
                </div>

                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                    <span><strong>0–45 ms:</strong> Classified as &quot;In Sync&quot; (broadcast standard).</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                    <span><strong>&gt; 45 ms:</strong> Classified as &quot;Lip-Sync Drift Detected&quot;.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-gray-400 shrink-0" />
                    <span><strong>Unmeasured:</strong> Always represented as &quot;—&quot; and never guessed.</span>
                  </li>
                </ul>

                <p className="text-[11px] text-gray-400 italic">
                  Note: Direct automated video streaming downloads via yt-dlp can be gated by YouTube bot-detection. Evaluated model clips are validated against the 120-clip benchmark set.
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* Video Sync Offsets Table */}
        <Card className="flex flex-col gap-4 overflow-hidden p-0">
          <div className="border-b border-[#dfe3e8] px-6 py-4 dark:border-gray-700">
            <h3 className="text-base font-semibold text-[#111827] dark:text-white">
              Video Sync Measurements
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Offset readings and confidence metrics for individual channel uploads
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f3f4f6] text-xs font-semibold uppercase tracking-wider text-gray-500 dark:bg-gray-800/80 dark:text-gray-400">
                <tr>
                  <th className="py-3 px-6">Video ID</th>
                  <th className="py-3 px-4">Offset (ms)</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Sync Verdict</th>
                  <th className="py-3 px-6">Measured Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dfe3e8] dark:divide-gray-700">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
                      No lip-sync records yet. Click &quot;Run Lip-Sync Check&quot; to evaluate.
                    </td>
                  </tr>
                ) : (
                  results.map((r, index) => (
                    <tr
                      key={`${r.video_id}-${index}`}
                      className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-700/40"
                    >
                      <td className="py-3.5 px-6 font-mono text-xs font-medium text-gray-900 dark:text-gray-200">
                        {r.video_id}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs font-semibold">
                        {r.offset_ms !== null ? `${r.offset_ms.toFixed(1)} ms` : '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-gray-500 dark:text-gray-400">
                        {r.confidence !== null ? `${Math.round(r.confidence * 100)}%` : '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        {r.status === 'in_sync' && <Badge variant="green">In Sync</Badge>}
                        {r.status === 'drift_detected' && <Badge variant="red">Lip-Sync Drift Detected</Badge>}
                        {r.status === 'not_measured' && <Badge variant="gray">Not Measured</Badge>}
                      </td>
                      <td className="py-3.5 px-6 text-xs text-gray-500 dark:text-gray-400">
                        {r.measured_at ? new Date(r.measured_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Local Video File Test Upload */}
        <Card className="flex flex-col gap-4">
          <div className="border-b border-gray-100 pb-3 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-[#111827] dark:text-white" />
              <h3 className="text-base font-semibold text-[#111827] dark:text-white">
                Local Video File Sync Test
              </h3>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Upload any local MP4 or WebM video file to evaluate audio-video offset directly against the 45 ms threshold.
            </p>
          </div>

          <form onSubmit={handleFileUpload} className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#111827] file:text-white hover:file:bg-gray-800 dark:file:bg-white dark:file:text-[#111827]"
              />
              <button
                type="submit"
                disabled={!fileToUpload || isFileTesting}
                className="shrink-0 rounded-xl bg-[#111827] px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-[#111827]"
              >
                {isFileTesting ? 'Analyzing Clip...' : 'Analyze File'}
              </button>
            </div>

            {fileError && (
              <p className="text-xs text-red-500">{fileError}</p>
            )}

            {fileResult && (
              <div className="mt-4 rounded-xl border border-[#dfe3e8] bg-[#f3f4f6] p-4 dark:border-gray-700 dark:bg-gray-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileVideo className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-semibold text-[#111827] dark:text-white">
                      File Test Verdict:
                    </span>
                    {fileResult.status === 'in_sync' ? (
                      <Badge variant="green">In Sync (≤ 45 ms)</Badge>
                    ) : (
                      <Badge variant="red">Lip-Sync Drift Detected</Badge>
                    )}
                  </div>
                  {fileResult.is_demo && (
                    <Badge variant="yellow">Demo Placeholder</Badge>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-4 text-xs font-medium text-gray-700 dark:text-gray-300">
                  <div>
                    <span className="text-gray-400">Offset:</span>{' '}
                    <span className="font-mono font-bold">{fileResult.offset_ms} ms</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Confidence:</span>{' '}
                    <span className="font-mono font-bold">{Math.round(fileResult.confidence * 100)}%</span>
                  </div>
                </div>

                <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                  {fileResult.message}
                </p>
              </div>
            )}
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default function LipSyncPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout title="Lip-Sync Analyzer">
          <div className="flex h-96 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </DashboardLayout>
      }
    >
      <LipSyncContent />
    </Suspense>
  );
}
