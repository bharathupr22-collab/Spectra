import type { ReactNode } from 'react';
import { Card } from './Card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ label, value, icon, className }: StatCardProps) {
  return (
    <Card className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        {icon && <span className="text-gray-400 dark:text-gray-500">{icon}</span>}
      </div>
      <span className="text-3xl font-bold text-gray-900 dark:text-gray-50">{value}</span>
    </Card>
  );
}
