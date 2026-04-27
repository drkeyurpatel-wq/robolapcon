'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { createClient } from '@/lib/supabase/client';
import { KeyRound, Info } from 'lucide-react';
import type { InviteCode } from '@/types';

export default function InviteCodesPage() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = createClient();
    sb.from('rlc_invite_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCodes(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <AdminShell>
      <h1 className="text-2xl font-bold mb-2">Invite Codes</h1>
      <p className="text-sm text-rlc-muted mb-6">{codes.length} codes total</p>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-rlc-accent/5 border border-rlc-accent/20 rounded-xl p-4 mb-6">
        <Info className="w-5 h-5 text-rlc-accent shrink-0 mt-0.5" />
        <div className="text-sm text-rlc-muted">
          <strong className="text-white">OPEN code used silently.</strong> The public
          registration form calls the <code className="text-rlc-accent">OPEN</code> invite
          code internally — delegates never see or enter a code. The 201 codes below are
          for tracking and internal use only. Do not modify them.
        </div>
      </div>

      <div className="rlc-card !p-0 overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Label</th>
              <th>Used / Max</th>
              <th>Active</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id}>
                <td className="font-mono text-sm">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-3.5 h-3.5 text-rlc-muted" />
                    {c.code}
                  </div>
                </td>
                <td className="text-sm">{c.label || '—'}</td>
                <td className="text-sm">
                  <span className="text-rlc-accent font-medium">{c.used_count}</span>
                  <span className="text-rlc-muted"> / {c.max_uses}</span>
                </td>
                <td>
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      c.is_active ? 'bg-rlc-accent' : 'bg-rlc-red'
                    }`}
                  />
                </td>
                <td className="text-xs text-rlc-muted whitespace-nowrap">
                  {new Date(c.created_at).toLocaleDateString('en-IN')}
                </td>
              </tr>
            ))}
            {codes.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-rlc-muted">
                  {loading ? 'Loading...' : 'No invite codes found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
