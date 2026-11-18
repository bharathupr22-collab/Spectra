'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, User as UserIcon, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentChannel = searchParams.get('channel') || '';
  const [searchInput, setSearchInput] = useState(currentChannel);
  const { user, logout } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    const cleanHandle = searchInput.trim();
    router.push(`/dashboard?channel=${encodeURIComponent(cleanHandle)}`);
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-[#dfe3e8] bg-white px-6 dark:border-gray-800 dark:bg-[#1f2937]">
      {/* Title */}
      <div className="flex items-center gap-4">
        {title && (
          <h1 className="text-lg font-semibold text-[#111827] dark:text-white">
            {title}
          </h1>
        )}
      </div>

      {/* Center Search Bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md mx-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search channel or @handle (e.g. @ApnaCollegeOfficial)..."
            className="w-full rounded-lg border border-[#dfe3e8] bg-[#f3f4f6] py-1.5 pl-9 pr-4 text-sm text-[#111827] placeholder-gray-400 transition-colors focus:border-[#111827] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#111827] dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-gray-500 dark:focus:bg-gray-800"
          />
        </div>
      </form>

      {/* Right Actions: Theme Toggle + User Status */}
      <div className="flex items-center gap-3">
        <ThemeToggle />

        {user ? (
          <div className="flex items-center gap-3 pl-2 border-l border-[#dfe3e8] dark:border-gray-700">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#111827] text-xs font-medium text-white dark:bg-gray-100 dark:text-[#111827]">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden md:inline">
              {user.name}
            </span>
            <button
              onClick={logout}
              title="Logout"
              className="text-gray-400 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pl-2 border-l border-[#dfe3e8] dark:border-gray-700">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-[#e7e9ec] dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <UserIcon className="h-3.5 w-3.5" />
              Sign in
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
