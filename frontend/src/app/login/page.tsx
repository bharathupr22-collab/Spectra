'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Activity, ArrowRight, AlertCircle } from 'lucide-react';
import { login, getMe } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await login(email, password);
      localStorage.setItem('token', res.access_token);
      const user = await getMe();
      setAuth(res.access_token, user);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#e7e9ec] dark:bg-[#111827] flex flex-col justify-between p-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#111827] text-white dark:bg-white dark:text-[#111827]">
            <Activity className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#111827] dark:text-white">
            Spectra
          </span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="mx-auto w-full max-w-md my-8">
        <div className="rounded-2xl border border-[#dfe3e8] bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-[#1f2937]">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-[#111827] dark:text-white">
              Welcome back
            </h1>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Sign in to manage your saved channels and owner features
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
            />

            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 h-11"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            Don't have an account?{' '}
            <Link
              href="/signup"
              className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              Sign up
            </Link>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 text-center dark:border-gray-700">
            <Link
              href="/dashboard"
              className="text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 inline-flex items-center gap-1"
            >
              Continue as guest spectator <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-gray-400">
        Spectra &copy; 2026. Free and open YouTube channel intelligence.
      </div>
    </div>
  );
}
