import { AlertTriangle } from 'lucide-react';

interface DemoBadgeProps {
  className?: string;
  message?: string;
}

export function DemoBadge({
  className = '',
  message = 'Demo Data — No YouTube API key configured. Showing simulated analytics.',
}: DemoBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300 ${className}`}
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <span>{message}</span>
    </div>
  );
}
