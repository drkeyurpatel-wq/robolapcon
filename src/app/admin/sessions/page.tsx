'use client';

import { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { createClient } from '@/lib/supabase/client';
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import type { Session, Track } from '@/types';

const EMPTY: Partial<Session> = {
  track_id: '',
  title: '',
  description: '',
  session_type: 'talk',
  day_number: 1,
  start_time: '',
  end_time: '',
  room: '',
  faculty_id: '',
  display_order: 0,
  is_active: true,
};

const SESSION_TYPES = ['talk', 'panel', 'workshop', 'live_surgery', 'video', 'keynote', 'break'];

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [faculty, setFaculty] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Session> | null>(null);
  const [saving, setSaving] = useState(false);
  const [dayFilter, setDayFilter] = useState(0); // 0 = all

  const sb = createClient();

  const load = async () => {
    setLoading(true);
    const [sRes, tRes, fRes] = await Promise.all([
      sb.from('rlc_sessions').select('*').order('day_number').order('display_order'),
      sb.from('rlc_tracks').select('*').eq('is_active', true).order('day_number'),
      sb.from('rlc_faculty').select('id, full_name').eq('is_active', true).order('full_name'),
    ]);
    setSessions(sRes.data || []);
    setTracks(tRes.data || []);
    setFaculty(fRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = dayFilter
    ? sessions.filter((s) => s.day_number === dayFilter)
    : sessions;

  const trackName = (id: string | null) =>
    tracks.find((t) => t.id === id)?.name || '—';

  const facultyName = (id: string | null) =>
    faculty.find((f) => f.id === id)?.full_name || '';

  const handleSave = async () => {
    if (!editing?.title?.trim()) return alert('Title is required');
    setSaving(true);

    const payload = {
      track_id: editing.track_id || null,
      title: editing.title!.trim(),
      description: editing.description?.trim() || null,
      session_type: editing.session_type || 'talk',
      day_number: editing.day_number || 1,
      start_time: editing.start_time || null,
      end_time: editing.end_time || null,
      room: editing.room?.trim() || null,
      faculty_id: editing.faculty_id || null,
      display_order: editing.display_order || 0,
      is_active: editing.is_active ?? true,
    };

    if (editing.id) {
      await sb.from('rlc_sessions').update(payload).eq('id', editing.id);
    } else {
      await sb.from('rlc_sessions').insert(payload);
    }

    setEditing(null);
    setSaving(false);
    load();
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete session "${title}"?`)) return;
    await sb.from('rlc_sessions').delete().eq('id', id);
    load();
  };

  return (
    <AdminShell>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sessions</h1>
          <p className="text-sm text-rlc-muted">{sessions.length} sessions</p>
        </div>
        <div className="flex gap-2">
          <select
            value={dayFilter}
            onChange={(e) => setDayFilter(Number(e.target.value))}
            className="rlc-select !w-auto"
          >
            <option value={0}>All Days</option>
            <option value={1}>Day 1</option>
            <option value={2}>Day 2</option>
          </select>
          <button
            onClick={() => setEditing({ ...EMPTY })}
            className="rlc-btn-primary !py-2"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      <div className="rlc-card !p-0 overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Title</th>
              <th>Track</th>
              <th>Type</th>
              <th>Time</th>
              <th>Faculty</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td className="text-sm font-medium">D{s.day_number}</td>
                <td>
                  <div className="font-medium text-white text-sm">{s.title}</div>
                  {s.room && (
                    <div className="text-xs text-rlc-muted">Room: {s.room}</div>
                  )}
                </td>
                <td className="text-sm">{trackName(s.track_id)}</td>
                <td>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rlc-bg-light text-rlc-muted">
                    {s.session_type}
                  </span>
                </td>
                <td className="text-xs text-rlc-muted whitespace-nowrap">
                  {s.start_time || '—'} – {s.end_time || '—'}
                </td>
                <td className="text-sm">{facultyName(s.faculty_id) || '—'}</td>
                <td>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditing({ ...s })}
                      className="p-1.5 rounded hover:bg-white/5 text-rlc-muted hover:text-white"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id, s.title)}
                      className="p-1.5 rounded hover:bg-rlc-red/10 text-rlc-muted hover:text-rlc-red"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-rlc-muted">
                  {loading ? 'Loading...' : 'No sessions found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-rlc-bg-card border border-rlc-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">
                {editing.id ? 'Edit Session' : 'Add Session'}
              </h2>
              <button onClick={() => setEditing(null)} className="p-1 rounded hover:bg-white/5 text-rlc-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="rlc-label">Title *</label>
                <input
                  value={editing.title || ''}
                  onChange={(e) => setEditing((p) => p && { ...p, title: e.target.value })}
                  className="rlc-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="rlc-label">Day</label>
                  <select
                    value={editing.day_number || 1}
                    onChange={(e) => setEditing((p) => p && { ...p, day_number: Number(e.target.value) })}
                    className="rlc-select"
                  >
                    <option value={1}>Day 1</option>
                    <option value={2}>Day 2</option>
                  </select>
                </div>
                <div>
                  <label className="rlc-label">Type</label>
                  <select
                    value={editing.session_type || 'talk'}
                    onChange={(e) => setEditing((p) => p && { ...p, session_type: e.target.value })}
                    className="rlc-select"
                  >
                    {SESSION_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="rlc-label">Track</label>
                <select
                  value={editing.track_id || ''}
                  onChange={(e) => setEditing((p) => p && { ...p, track_id: e.target.value })}
                  className="rlc-select"
                >
                  <option value="">No track</option>
                  {tracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      D{t.day_number}: {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="rlc-label">Start Time</label>
                  <input
                    type="time"
                    value={editing.start_time || ''}
                    onChange={(e) => setEditing((p) => p && { ...p, start_time: e.target.value })}
                    className="rlc-input"
                  />
                </div>
                <div>
                  <label className="rlc-label">End Time</label>
                  <input
                    type="time"
                    value={editing.end_time || ''}
                    onChange={(e) => setEditing((p) => p && { ...p, end_time: e.target.value })}
                    className="rlc-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="rlc-label">Room</label>
                  <input
                    value={editing.room || ''}
                    onChange={(e) => setEditing((p) => p && { ...p, room: e.target.value })}
                    className="rlc-input"
                  />
                </div>
                <div>
                  <label className="rlc-label">Faculty</label>
                  <select
                    value={editing.faculty_id || ''}
                    onChange={(e) => setEditing((p) => p && { ...p, faculty_id: e.target.value })}
                    className="rlc-select"
                  >
                    <option value="">None</option>
                    {faculty.map((f) => (
                      <option key={f.id} value={f.id}>{f.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="rlc-label">Description</label>
                <textarea
                  value={editing.description || ''}
                  onChange={(e) => setEditing((p) => p && { ...p, description: e.target.value })}
                  className="rlc-input min-h-[60px] resize-y"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="rlc-label">Display Order</label>
                  <input
                    type="number"
                    value={editing.display_order || 0}
                    onChange={(e) => setEditing((p) => p && { ...p, display_order: parseInt(e.target.value) || 0 })}
                    className="rlc-input"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editing.is_active ?? true}
                      onChange={(e) => setEditing((p) => p && { ...p, is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-rlc-border bg-rlc-bg-light accent-rlc-accent"
                    />
                    Active
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-rlc-border">
              <button onClick={() => setEditing(null)} className="rlc-btn-outline !py-2">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rlc-btn-primary !py-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
