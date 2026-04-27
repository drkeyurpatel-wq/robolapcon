'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Create token client-side (same logic as middleware)
    const salt = 'robolapcon2026salt';
    const token = btoa(password + salt);

    // Set cookie
    const maxAge = 12 * 60 * 60;
    document.cookie = `rlc_admin=${token}; path=/; max-age=${maxAge}; samesite=lax`;

    // Navigate — middleware will validate
    router.push('/admin/delegates');
    router.refresh();
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-xl bg-rlc-accent/10 flex items-center justify-center mb-4">
            <Bot className="w-7 h-7 text-rlc-accent" />
          </div>
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <p className="text-sm text-rlc-muted mt-1">ROBOLAPCON 2026</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="rlc-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className="rlc-input"
              placeholder="Enter admin password"
              autoFocus
            />
          </div>

          {error && (
            <div className="text-sm text-rlc-red">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="rlc-btn-primary w-full !py-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </button>
        </form>
      </div>
    </main>
  );
}
