import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: ReactNode;
}

export function Button({ variant = 'primary', children, className, disabled, ...props }: ButtonProps) {
  const base = 'rounded-lg px-4 py-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2';
  const variants = {
    primary:
      'bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-900 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200 dark:focus:ring-gray-100',
    secondary:
      'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
    ghost:
      'text-gray-700 hover:bg-gray-100 focus:ring-gray-300 dark:text-gray-300 dark:hover:bg-gray-700',
  };

  return (
    <button className={cn(base, variants[variant], className)} disabled={disabled} {...props}>
      {children}
    </button>
  );
}
