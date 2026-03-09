import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import SuperAdminShell from './components/SuperAdminShell';
import { Badge, FieldLabel, GhostButton, PrimaryButton } from './components/ui';
import type { ContentPack } from './types';

export default function PacksPage() {
  const [packs, setPacks] = useState<ContentPack[]>([]);
  const [loading, setLoading] = useState(false);
  const [packSearch, setPackSearch] = useState('');
  const [packForm, setPackForm] = useState({ name: '', description: '' });

  const filteredPacks = useMemo(() => {
    const term = packSearch.trim().toLowerCase();
    if (!term) return packs;
    return packs.filter((pack) =>
      [pack.name, pack.description || ''].some((value) => value.toLowerCase().includes(term)),
    );
  }, [packs, packSearch]);

  const loadPacks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/platform/content-packs');
      setPacks(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load content packs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPacks();
  }, []);

  const createPack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packForm.name.trim()) return;
    try {
      await api.post('/platform/content-packs', packForm);
      setPackForm({ name: '', description: '' });
      loadPacks();
      toast.success('Content pack created');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create content pack');
    }
  };

  const deactivatePack = async (id: number) => {
    try {
      await api.delete(`/platform/content-packs/${id}`);
      loadPacks();
      toast.success('Content pack updated');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update content pack');
    }
  };

  return (
    <SuperAdminShell
      title="Content Packs"
      subtitle="Curate bundles of learning content available to tenants."
    >
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Content Packs</h2>
              <p className="text-sm text-slate-500">Bundle courses into curated subscriptions.</p>
            </div>
            <input
              value={packSearch}
              onChange={(e) => setPackSearch(e.target.value)}
              placeholder="Search packs"
              className="w-44 rounded-full border border-slate-200 px-3 py-2 text-xs"
            />
          </div>
          <div className="mt-5 space-y-3">
            {loading && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                Loading content packs...
              </div>
            )}
            {!loading &&
              filteredPacks.map((pack) => (
                <div
                  key={pack.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{pack.name}</div>
                    <div className="text-xs text-slate-500">{pack.description || 'No description added'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      tone={
                        pack.is_active
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-100 text-slate-500'
                      }
                    >
                      {pack.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <GhostButton onClick={() => deactivatePack(pack.id)} disabled={!pack.is_active}>
                      Deactivate
                    </GhostButton>
                  </div>
                </div>
              ))}
            {!loading && filteredPacks.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                No content packs found.
              </div>
            )}
          </div>
        </div>

        <form onSubmit={createPack} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Create Pack</div>
          <h3 className="mt-2 text-lg font-semibold">New Content Pack</h3>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <FieldLabel>Pack Name</FieldLabel>
              <input
                value={packForm.name}
                onChange={(e) => setPackForm({ ...packForm, name: e.target.value })}
                placeholder="Higher Secondary STEM"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Description</FieldLabel>
              <textarea
                value={packForm.description}
                onChange={(e) => setPackForm({ ...packForm, description: e.target.value })}
                placeholder="Add a short description of the pack."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                rows={4}
              />
            </div>
            <PrimaryButton type="submit" disabled={!packForm.name.trim()}>
              Create Pack
            </PrimaryButton>
          </div>
        </form>
      </div>
    </SuperAdminShell>
  );
}
