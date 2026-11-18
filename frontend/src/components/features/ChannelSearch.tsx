'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ChannelSearchProps {
  className?: string;
  placeholder?: string;
  buttonText?: string;
}

export function ChannelSearch({
  className = '',
  placeholder = 'Enter channel name or handle (e.g. @ApnaCollegeOfficial)...',
  buttonText = 'Analyse Channel',
}: ChannelSearchProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/dashboard?channel=${encodeURIComponent(query.trim())}`);
  };

  return (
    <form onSubmit={handleSearch} className={`relative flex w-full max-w-2xl items-center ${className}`}>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-[#dfe3e8] bg-white py-3.5 pl-12 pr-4 text-base text-[#111827] shadow-sm transition-all focus:border-[#111827] focus:outline-none focus:ring-2 focus:ring-[#111827]/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-gray-500"
        />
      </div>
      <Button
        type="submit"
        className="ml-3 shrink-0 h-12 px-6 rounded-xl text-sm font-semibold shadow-sm"
      >
        <span>{buttonText}</span>
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}
