import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TableProps {
  headers: string[];
  children: ReactNode;
  className?: string;
}

export function Table({ headers, children, className }: TableProps) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {children}
        </tbody>
      </table>
    </div>
  );
}
