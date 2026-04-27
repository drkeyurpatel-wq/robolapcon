'use client';
import { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { createClient } from '@/lib/supabase/client';
import { KeyRound, Info } from 'lucide-react';

export default function InviteCodesPage() {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = createClient();
    sb.rpc('rlc_admin_invite_codes').then(({ data }) => { setCodes(data || []); setLoading(false); });
  }, []);

  return (
    <AdminShell>
      <h1 className="text-2xl font-bold mb-2">Invite Codes</h1>
      <p className="text-sm text-rlc-muted mb-6">{codes.length} codes total</p>
      <div className="flex items-start gap-3 bg-rlc-accent/5 border border-rlc-accent/20 rounded-xl p-4 mb-6">
        <Info className="w-5 h-5 text-rlc-accent shrink-0 mt-0.5" />
        <div className="text-sm text-rlc-muted"><strong className="text-white">OPEN code used silently.</strong> The registration form uses the OPEN invite code internally. Delegates never see or enter a code.</div>
      </div>
      <div className="rlc-card !p-0 overflow-x-auto">
        <table className="admin-table">
          <thead><tr><th>Code</th><th>Batch</th><th>Used / Max</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>
            {codes.map((c: any) => (
              <tr key={c.id}>
                <td className="font-mono text-sm"><div className="flex items-center gap-2"><KeyRound className="w-3.5 h-3.5 text-rlc-muted" />{c.code}</div></td>
                <td className="text-sm">{c.batch_label || c.notes || '—'}</td>
                <td className="text-sm"><span className="text-rlc-accent font-medium">{c.used_count}</span><span className="text-rlc-muted"> / {c.max_uses}</span></td>
                <td><span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${c.status === 'active' ? 'bg-rlc-accent/10 text-rlc-accent' : c.status === 'used' ? 'bg-rlc-muted/10 text-rlc-muted' : c.status === 'partial' ? 'bg-rlc-amber/10 text-rlc-amber' : 'bg-rlc-red/10 text-rlc-red'}`}>{c.status}</span></td>
                <td className="text-xs text-rlc-muted whitespace-nowrap">{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
            {codes.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-rlc-muted">{loading ? 'Loading...' : 'No codes.'}</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
