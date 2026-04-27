'use client';
import { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { createClient } from '@/lib/supabase/client';
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';

const SESSION_TYPES = ['registration','inaugural','address','recorded_message','event_overview','live_surgery','panel','tea_break','lunch','drylab','closing','other'];
const EMPTY = { title: '', subtitle: '', description: '', type: 'live_surgery', day_number: 1, start_time: '', end_time: '', track_code: '', procedure_name: '', modality: '', case_number: null, display_order: 0, visible: true };

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [dayFilter, setDayFilter] = useState(0);
  const [eventId, setEventId] = useState('');
  const sb = createClient();

  const load = async () => {
    setLoading(true);
    const { data: ev } = await sb.from('events').select('id').limit(1).single();
    if (ev) setEventId(ev.id);
    const { data: s } = await sb.rpc('rlc_admin_sessions');
    setSessions(s || []);
    const { data: t } = await sb.from('rlc_tracks').select('code, display_name, day_number').eq('active', true).order('day_number');
    setTracks(t || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = dayFilter ? sessions.filter((s: any) => s.day_number === dayFilter) : sessions;
  const trackName = (code: string | null) => tracks.find((t: any) => t.code === code)?.display_name || code || '—';

  const handleSave = async () => {
    if (!editing?.title?.trim()) return alert('Title required');
    setSaving(true);
    const payload: any = {
      title: editing.title.trim(), subtitle: editing.subtitle?.trim() || null,
      description: editing.description?.trim() || null, type: editing.type || 'other',
      day_number: String(editing.day_number || 1),
      start_time: editing.start_time || null, end_time: editing.end_time || null,
      track_code: editing.track_code || null, procedure_name: editing.procedure_name?.trim() || null,
      modality: editing.modality?.trim() || null,
      case_number: editing.case_number ? String(editing.case_number) : null,
      display_order: String(editing.display_order || 0), visible: String(editing.visible ?? true),
    };
    if (editing.id) payload.id = editing.id;
    else payload.event_id = eventId;
    await sb.rpc('rlc_admin_upsert_session', { p_data: payload });
    setEditing(null); setSaving(false); load();
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    await sb.rpc('rlc_admin_delete_session', { p_id: id });
    load();
  };

  return (
    <AdminShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div><h1 className="text-2xl font-bold">Sessions</h1><p className="text-sm text-rlc-muted">{sessions.length} sessions</p></div>
        <div className="flex gap-2">
          <select value={dayFilter} onChange={e => setDayFilter(Number(e.target.value))} className="rlc-select !w-auto"><option value={0}>All Days</option><option value={1}>Day 1</option><option value={2}>Day 2</option></select>
          <button onClick={() => setEditing({ ...EMPTY })} className="rlc-btn-primary !py-2"><Plus className="w-4 h-4" /> Add</button>
        </div>
      </div>
      <div className="rlc-card !p-0 overflow-x-auto">
        <table className="admin-table">
          <thead><tr><th>Day</th><th>Title</th><th>Track</th><th>Type</th><th>Time</th><th></th></tr></thead>
          <tbody>
            {filtered.map((s: any) => (
              <tr key={s.id}>
                <td className="text-sm font-medium">D{s.day_number}</td>
                <td><div className="font-medium text-white text-sm">{s.title}</div>{s.subtitle && <div className="text-xs text-rlc-muted">{s.subtitle}</div>}{s.modality && <div className="text-xs text-rlc-accent">{s.modality}</div>}</td>
                <td className="text-sm">{trackName(s.track_code)}</td>
                <td><span className="text-xs px-2 py-0.5 rounded-full bg-rlc-bg-light text-rlc-muted">{s.type?.replace(/_/g, ' ')}</span></td>
                <td className="text-xs text-rlc-muted whitespace-nowrap">{s.start_time?.slice(0,5) || '—'} – {s.end_time?.slice(0,5) || '—'}</td>
                <td><div className="flex gap-1">
                  <button onClick={() => setEditing({ ...s })} className="p-1.5 rounded hover:bg-white/5 text-rlc-muted hover:text-white"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(s.id, s.title)} className="p-1.5 rounded hover:bg-rlc-red/10 text-rlc-muted hover:text-rlc-red"><Trash2 className="w-3.5 h-3.5" /></button>
                </div></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-rlc-muted">{loading ? 'Loading...' : 'No sessions.'}</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-rlc-bg-card border border-rlc-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between mb-5"><h2 className="text-lg font-bold">{editing.id ? 'Edit' : 'Add'} Session</h2><button onClick={() => setEditing(null)} className="text-rlc-muted"><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div><label className="rlc-label">Title *</label><input value={editing.title || ''} onChange={e => setEditing((p: any) => ({ ...p, title: e.target.value }))} className="rlc-input" /></div>
              <div><label className="rlc-label">Subtitle</label><input value={editing.subtitle || ''} onChange={e => setEditing((p: any) => ({ ...p, subtitle: e.target.value }))} className="rlc-input" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="rlc-label">Day</label><select value={editing.day_number || 1} onChange={e => setEditing((p: any) => ({ ...p, day_number: Number(e.target.value) }))} className="rlc-select"><option value={1}>Day 1</option><option value={2}>Day 2</option></select></div>
                <div><label className="rlc-label">Type</label><select value={editing.type || 'other'} onChange={e => setEditing((p: any) => ({ ...p, type: e.target.value }))} className="rlc-select">{SESSION_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}</select></div>
              </div>
              <div><label className="rlc-label">Track</label><select value={editing.track_code || ''} onChange={e => setEditing((p: any) => ({ ...p, track_code: e.target.value }))} className="rlc-select"><option value="">None</option>{tracks.map((t: any) => <option key={t.code} value={t.code}>D{t.day_number}: {t.display_name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="rlc-label">Start</label><input type="time" value={editing.start_time?.slice(0,5) || ''} onChange={e => setEditing((p: any) => ({ ...p, start_time: e.target.value }))} className="rlc-input" /></div>
                <div><label className="rlc-label">End</label><input type="time" value={editing.end_time?.slice(0,5) || ''} onChange={e => setEditing((p: any) => ({ ...p, end_time: e.target.value }))} className="rlc-input" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="rlc-label">Procedure</label><input value={editing.procedure_name || ''} onChange={e => setEditing((p: any) => ({ ...p, procedure_name: e.target.value }))} className="rlc-input" /></div>
                <div><label className="rlc-label">Modality</label><input value={editing.modality || ''} onChange={e => setEditing((p: any) => ({ ...p, modality: e.target.value }))} className="rlc-input" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="rlc-label">Case #</label><input type="number" value={editing.case_number || ''} onChange={e => setEditing((p: any) => ({ ...p, case_number: parseInt(e.target.value) || null }))} className="rlc-input" /></div>
                <div><label className="rlc-label">Order</label><input type="number" value={editing.display_order || 0} onChange={e => setEditing((p: any) => ({ ...p, display_order: parseInt(e.target.value) || 0 }))} className="rlc-input" /></div>
                <div className="flex items-end pb-1"><label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={editing.visible ?? true} onChange={e => setEditing((p: any) => ({ ...p, visible: e.target.checked }))} className="w-4 h-4 accent-rlc-accent" />Visible</label></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-rlc-border">
              <button onClick={() => setEditing(null)} className="rlc-btn-outline !py-2">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rlc-btn-primary !py-2 disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
