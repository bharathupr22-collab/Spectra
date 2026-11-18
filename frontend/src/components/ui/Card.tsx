import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl shadow-sm border border-[#dfe3e8] bg-white p-6 dark:bg-gray-800 dark:border-gray-700',
        className
      )}
    >
      {children}
    </div>
  );
}
