'use client';

import { Suspense, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface DashboardLayoutProps {
  title?: string;
  children: ReactNode;
}

export function DashboardLayout({ title, children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#e7e9ec] dark:bg-[#111827]">
      <Suspense fallback={<div className="w-64" />}>
        <Sidebar />
      </Suspense>

      <div className="pl-64 flex flex-col min-h-screen">
        <Suspense fallback={<div className="h-16" />}>
          <TopBar title={title} />
        </Suspense>

        <main className="flex-1 p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
