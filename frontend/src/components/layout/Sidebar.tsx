'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  Link2,
  AudioLines,
  Settings,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Growth Analysis', href: '/growth', icon: TrendingUp },
  { name: 'Broken Link Analyzer', href: '/links', icon: Link2 },
  { name: 'Lip-Sync Analyzer', href: '/lipsync', icon: AudioLines },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const channelParam = searchParams.get('channel');
  const channelQuery = channelParam ? `?channel=${encodeURIComponent(channelParam)}` : '';

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-[#dfe3e8] bg-[#f3f4f6] dark:border-gray-800 dark:bg-[#1f2937]">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-[#dfe3e8] dark:border-gray-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#111827] text-white dark:bg-white dark:text-[#111827]">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <span className="text-xl font-bold tracking-tight text-[#111827] dark:text-white">
            Spectra
          </span>
          <span className="ml-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            Analytics
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 px-3 py-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={`${item.href}${channelQuery}`}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-[#111827] text-white shadow-sm dark:bg-white dark:text-[#111827]'
                  : 'text-gray-600 hover:bg-[#e7e9ec] hover:text-[#111827] dark:text-gray-300 dark:hover:bg-gray-800/80 dark:hover:text-white'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 transition-colors',
                  isActive
                    ? 'text-white dark:text-[#111827]'
                    : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-400 dark:group-hover:text-gray-200'
                )}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Settings */}
      <div className="border-t border-[#dfe3e8] p-3 dark:border-gray-800">
        <Link
          href={`/settings${channelQuery}`}
          className={cn(
            'group flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all duration-150',
            pathname === '/settings'
              ? 'bg-[#111827] text-white shadow-sm dark:bg-white dark:text-[#111827]'
              : 'text-gray-600 hover:bg-[#e7e9ec] hover:text-[#111827] dark:text-gray-300 dark:hover:bg-gray-800/80 dark:hover:text-white'
          )}
        >
          <Settings
            className={cn(
              'h-4 w-4 transition-colors',
              pathname === '/settings'
                ? 'text-white dark:text-[#111827]'
                : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-400 dark:group-hover:text-gray-200'
            )}
          />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
