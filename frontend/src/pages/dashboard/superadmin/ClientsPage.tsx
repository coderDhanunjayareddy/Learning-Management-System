import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import SuperAdminShell from './components/SuperAdminShell';
import { Badge, FieldLabel, GhostButton, PrimaryButton, StatCard } from './components/ui';
import type { Client } from './types';

type DrawerMode = 'create' | 'view' | 'edit';

export default function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('create');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientForm, setClientForm] = useState({ name: '', slug: '', timezone: 'Asia/Kolkata' });

  const isFormValid = useMemo(() => clientForm.name.trim() && clientForm.slug.trim(), [clientForm]);

  const clientStats = useMemo(() => {
    const active = clients.filter((client) => client.is_active).length;
    const inactive = clients.length - active;
    const timezones = new Set(clients.map((client) => client.timezone)).size;
    return { total: clients.length, active, inactive, timezones };
  }, [clients]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const res = await api.get('/platform/clients');
      setClients(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const openCreateDrawer = () => {
    setDrawerMode('create');
    setSelectedClient(null);
    setClientForm({ name: '', slug: '', timezone: 'Asia/Kolkata' });
    setDrawerOpen(true);
  };

  const openViewDrawer = (client: Client) => {
    setDrawerMode('view');
    setSelectedClient(client);
    setDrawerOpen(true);
  };

  const openEditDrawer = (client: Client) => {
    setDrawerMode('edit');
    setSelectedClient(client);
    setClientForm({ name: client.name, slug: client.slug, timezone: client.timezone });
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  const createClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    try {
      await api.post('/platform/clients', clientForm);
      setClientForm({ name: '', slug: '', timezone: 'Asia/Kolkata' });
      loadClients();
      toast.success('Client created');
      closeDrawer();
    } catch (error) {
      console.error(error);
      toast.error('Failed to create client');
    }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.error('Edit API not available yet');
  };

  const deactivateClient = async (id: number) => {
    try {
      await api.delete(`/platform/clients/${id}`);
      loadClients();
      toast.success('Client deleted');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update client');
    }
  };

  return (
    <SuperAdminShell
      title="Clients"
      subtitle="Manage client accounts, activation, and tenant metadata."
      actions={
        <button
          onClick={openCreateDrawer}
          className="rounded-full bg-[#073b8a] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#16263b]"
        >
          Add Client
        </button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Clients" value={clientStats.total} caption="All tenants" />
        <StatCard label="Active" value={clientStats.active} caption="Live accounts" />
        <StatCard label="Inactive" value={clientStats.inactive} caption="Deactivated" />
        <StatCard label="Timezones" value={clientStats.timezones} caption="Unique regions" />
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Client Directory</h2>
            <p className="text-sm text-slate-500">Tap a client to view profile details.</p>
          </div>
          <button
            onClick={loadClients}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              Loading clients...
            </div>
          )}
          {!loading && clients.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
              No clients found.
            </div>
          )}
          {!loading &&
            clients.map((client) => (
              <div
                key={client.id}
                className="group rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition hover:border-slate-200"
              >
                <button onClick={() => openViewDrawer(client)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{client.name}</div>
                      <div className="text-xs text-slate-500">{client.slug}</div>
                      <div className="text-xs text-slate-500">Timezone: {client.timezone}</div>
                    </div>
                    <Badge
                      tone={
                        client.is_active
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-100 text-slate-500'
                      }
                    >
                      {client.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </button>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <GhostButton onClick={() => openViewDrawer(client)}>View</GhostButton>
                  <GhostButton onClick={() => openEditDrawer(client)}>Edit</GhostButton>
                  <GhostButton onClick={() => deactivateClient(client.id)}>
                    Delete
                  </GhostButton>
                  <GhostButton onClick={() => navigate('/superadmin/entitlements')}>Entitlements</GhostButton>
                </div>
              </div>
            ))}
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closeDrawer} />
          <div className="absolute right-0 top-0 h-full w-full max-w-lg border-l border-slate-200 bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  {drawerMode === 'create' && 'Create Client'}
                  {drawerMode === 'view' && 'Client Profile'}
                  {drawerMode === 'edit' && 'Edit Client'}
                </div>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">
                  {drawerMode === 'create' && 'New Tenant'}
                  {drawerMode === 'view' && (selectedClient?.name || 'Client Details')}
                  {drawerMode === 'edit' && (selectedClient?.name || 'Edit Tenant')}
                </h3>
              </div>
              <button
                onClick={closeDrawer}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
              >
                Close
              </button>
            </div>

            <div className="p-6">
              {drawerMode === 'view' && selectedClient && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">Client Name</div>
                    <div className="text-sm font-semibold text-slate-900">{selectedClient.name}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">Slug</div>
                    <div className="text-sm font-semibold text-slate-900">{selectedClient.slug}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">Timezone</div>
                    <div className="text-sm font-semibold text-slate-900">{selectedClient.timezone}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">Status</div>
                    <div className="text-sm font-semibold text-slate-900">
                      {selectedClient.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>
              )}

              {(drawerMode === 'create' || drawerMode === 'edit') && (
                <form onSubmit={drawerMode === 'create' ? createClient : saveEdit} className="space-y-4">
                  <div className="space-y-2">
                    <FieldLabel>Client Name</FieldLabel>
                    <input
                      value={clientForm.name}
                      onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                      placeholder="Spectropy Academy"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Client Slug</FieldLabel>
                    <input
                      value={clientForm.slug}
                      onChange={(e) => setClientForm({ ...clientForm, slug: e.target.value })}
                      placeholder="spectropy"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel>Timezone</FieldLabel>
                    <input
                      value={clientForm.timezone}
                      onChange={(e) => setClientForm({ ...clientForm, timezone: e.target.value })}
                      placeholder="Asia/Kolkata"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <PrimaryButton type="submit" disabled={!isFormValid}>
                    {drawerMode === 'create' ? 'Create Client' : 'Save Changes'}
                  </PrimaryButton>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </SuperAdminShell>
  );
}
