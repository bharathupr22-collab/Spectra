'use client';

import Link from 'next/link';
import {
  Activity,
  BarChart3,
  TrendingUp,
  Link2,
  AudioLines,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
} from 'lucide-react';
import { ChannelSearch } from '@/components/features/ChannelSearch';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';

export default function WelcomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#e7e9ec] dark:bg-[#111827] text-[#111827] dark:text-gray-100 flex flex-col">
      {/* Top Navbar */}
      <header className="flex h-20 items-center justify-between border-b border-[#dfe3e8] bg-white/80 px-6 backdrop-blur-md lg:px-12 dark:border-gray-800 dark:bg-[#1f2937]/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#111827] text-white dark:bg-white dark:text-[#111827]">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight">Spectra</span>
            <span className="ml-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
              Channel Spectrum
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          {user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-[#111827] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-gray-800 dark:bg-white dark:text-[#111827] dark:hover:bg-gray-100"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-700 hover:text-black dark:text-gray-300 dark:hover:text-white"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-[#111827] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-gray-800 dark:bg-white dark:text-[#111827] dark:hover:bg-gray-100"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative px-6 py-20 text-center lg:py-28">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dfe3e8] bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <Zap className="h-3.5 w-3.5 text-blue-500" />
              <span>Free Public YouTube Channel Intelligence</span>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-[#111827] dark:text-white">
              Every view. Every video.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                Every insight.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
              Spectra provides 360° analytics for any public YouTube channel. Paste any name or handle —
              examine authentic metrics, daily growth tracking, broken description links, and lip-sync drift. No sign-in required.
            </p>

            {/* Main Channel Search Form */}
            <div className="mt-10 flex justify-center">
              <ChannelSearch
                placeholder="Enter channel handle (e.g. @ApnaCollegeOfficial)..."
                buttonText="Analyse Channel"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-green-500" />
                Any public YouTube channel
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                No login or password needed
              </span>
              <span>
                Try: <Link href="/dashboard?channel=@ApnaCollegeOfficial" className="underline font-semibold hover:text-blue-500">@ApnaCollegeOfficial</Link> or <Link href="/dashboard" className="underline font-semibold hover:text-blue-500">Demo Channel</Link>
              </span>
            </div>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="px-6 py-16 lg:px-12 bg-white/60 dark:bg-[#1a2333]/40 border-y border-[#dfe3e8] dark:border-gray-800">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold tracking-tight text-[#111827] dark:text-white">
                The Four Pillars of Spectra
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Purpose-built tools designed for creators, auditors, and channel spectators
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Feature 1 */}
              <div className="rounded-xl border border-[#dfe3e8] bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-[#1f2937]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#111827] dark:text-white">
                  Channel Dashboard
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Real subscriber count, total views, video count, average views per video, top video highlight, and paginated video lists.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-xl border border-[#dfe3e8] bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-[#1f2937]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#111827] dark:text-white">
                  Growth Analysis
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Daily and weekly growth changes calculated strictly from real database snapshots. No invented backfills or synthetic history.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-xl border border-[#dfe3e8] bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-[#1f2937]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                  <Link2 className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#111827] dark:text-white">
                  Broken Link Analyzer
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Scans every video description with NLP tokenizer & classifier. Finds bare links (amzn.in, linktr.ee) and checks status live with SSRF defense.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="rounded-xl border border-[#dfe3e8] bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-[#1f2937]">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                  <AudioLines className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#111827] dark:text-white">
                  Lip-Sync Analyzer
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Audio-visual sync offset measurement in milliseconds. Categorizes drift using the 45 ms threshold, with local video upload testing.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Optional Account CTA */}
        <section className="px-6 py-16 text-center">
          <div className="mx-auto max-w-3xl rounded-2xl border border-[#dfe3e8] bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-[#1f2937]">
            <h2 className="text-2xl font-bold text-[#111827] dark:text-white">
              Want saved channels & owner analytics?
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Create a free account to pin your favorite channels, record long-term snapshots, or connect your Google channel account in Settings.
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <Link
                href="/signup"
                className="rounded-xl bg-[#111827] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-gray-800 dark:bg-white dark:text-[#111827] dark:hover:bg-gray-100"
              >
                Create Free Account
              </Link>
              <Link
                href="/dashboard"
                className="rounded-xl border border-[#dfe3e8] bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Continue Without Account
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#dfe3e8] bg-white py-6 text-center text-xs text-gray-500 dark:border-gray-800 dark:bg-[#1f2937] dark:text-gray-400">
        <p>Spectra — Public YouTube Channel Analytics. Built with Next.js 16, React 19, FastAPI, and Tailwind CSS 4.</p>
      </footer>
    </div>
  );
}
