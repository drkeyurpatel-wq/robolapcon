'use client';
import { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { createClient } from '@/lib/supabase/client';
import { Plus, Pencil, Trash2, X, Upload, Loader2 } from 'lucide-react';

const EMPTY = { full_name: '', designation: '', qualifications: '', hospital: '', city: '', photo_url: '', bio: '', is_featured: false, display_order: 0, active: true };

export default function FacultyPage() {
  const [faculty, setFaculty] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [eventId, setEventId] = useState('');
  const sb = createClient();

  const load = async () => {
    setLoading(true);
    const { data: ev } = await sb.from('events').select('id').limit(1).single();
    if (ev) setEventId(ev.id);
    const { data } = await sb.rpc('rlc_admin_faculty');
    setFaculty(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing?.full_name?.trim()) return alert('Name required');
    setSaving(true);
    const payload: any = {
      full_name: editing.full_name.trim(), designation: editing.designation?.trim() || null,
      qualifications: editing.qualifications?.trim() || null, bio: editing.bio?.trim() || null,
      photo_url: editing.photo_url?.trim() || null, hospital: editing.hospital?.trim() || null,
      city: editing.city?.trim() || null, display_order: String(editing.display_order || 0),
      is_featured: String(editing.is_featured || false), active: String(editing.active ?? true),
    };
    if (editing.id) payload.id = editing.id;
    else payload.event_id = eventId;
    await sb.rpc('rlc_admin_upsert_faculty', { p_data: payload });
    setEditing(null); setSaving(false); load();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await sb.rpc('rlc_admin_delete_faculty', { p_id: id });
    load();
  };

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold">Faculty</h1><p className="text-sm text-rlc-muted">{faculty.length} members</p></div>
        <button onClick={() => setEditing({ ...EMPTY })} className="rlc-btn-primary !py-2"><Plus className="w-4 h-4" /> Add</button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {faculty.map((f: any) => (
          <div key={f.id} className="rlc-card flex gap-4">
            <div className="w-16 h-16 rounded-lg bg-rlc-bg-light overflow-hidden shrink-0">
              {f.photo_url ? <img src={f.photo_url} alt={f.full_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-rlc-muted text-xs">No Photo</div>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-white text-sm">{f.full_name}</h3>
                  <p className="text-xs text-rlc-muted">{f.designation}</p>
                  <p className="text-xs text-rlc-accent">{f.city}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setEditing({ ...f })} className="p-1.5 rounded hover:bg-white/5 text-rlc-muted hover:text-white"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(f.id, f.full_name)} className="p-1.5 rounded hover:bg-rlc-red/10 text-rlc-muted hover:text-rlc-red"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                {f.is_featured && <span className="text-[10px] font-semibold px-2 py-0.5 bg-rlc-amber/10 text-rlc-amber rounded-full">FEATURED</span>}
                {!f.active && <span className="text-[10px] font-semibold px-2 py-0.5 bg-rlc-red/10 text-rlc-red rounded-full">INACTIVE</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
      {faculty.length === 0 && !loading && <p className="text-center text-rlc-muted py-12">No faculty yet.</p>}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-rlc-bg-card border border-rlc-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5"><h2 className="text-lg font-bold">{editing.id ? 'Edit' : 'Add'} Faculty</h2>
              <button onClick={() => setEditing(null)} className="text-rlc-muted"><X className="w-5 h-5" /></button></div>
            <div className="space-y-4">
              <div><label className="rlc-label">Full Name *</label><input value={editing.full_name || ''} onChange={e => setEditing((p: any) => ({ ...p, full_name: e.target.value }))} className="rlc-input" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="rlc-label">Designation</label><input value={editing.designation || ''} onChange={e => setEditing((p: any) => ({ ...p, designation: e.target.value }))} className="rlc-input" /></div>
                <div><label className="rlc-label">Qualifications</label><input value={editing.qualifications || ''} onChange={e => setEditing((p: any) => ({ ...p, qualifications: e.target.value }))} className="rlc-input" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="rlc-label">Hospital</label><input value={editing.hospital || ''} onChange={e => setEditing((p: any) => ({ ...p, hospital: e.target.value }))} className="rlc-input" /></div>
                <div><label className="rlc-label">City</label><input value={editing.city || ''} onChange={e => setEditing((p: any) => ({ ...p, city: e.target.value }))} className="rlc-input" /></div>
              </div>
              <div><label className="rlc-label">Photo URL</label><input value={editing.photo_url || ''} onChange={e => setEditing((p: any) => ({ ...p, photo_url: e.target.value }))} className="rlc-input" placeholder="Paste URL" /></div>
              <div><label className="rlc-label">Bio</label><textarea value={editing.bio || ''} onChange={e => setEditing((p: any) => ({ ...p, bio: e.target.value }))} className="rlc-input min-h-[60px] resize-y" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="rlc-label">Display Order</label><input type="number" value={editing.display_order || 0} onChange={e => setEditing((p: any) => ({ ...p, display_order: parseInt(e.target.value) || 0 }))} className="rlc-input" /></div>
                <div className="flex items-end gap-4 pb-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={editing.is_featured || false} onChange={e => setEditing((p: any) => ({ ...p, is_featured: e.target.checked }))} className="w-4 h-4 accent-rlc-accent" />Featured</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={editing.active ?? true} onChange={e => setEditing((p: any) => ({ ...p, active: e.target.checked }))} className="w-4 h-4 accent-rlc-accent" />Active</label>
                </div>
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
