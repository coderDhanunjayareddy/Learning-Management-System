import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import SuperAdminShell from './components/SuperAdminShell';
import { FieldLabel, GhostButton, PrimaryButton } from './components/ui';
import type { Client } from './types';

export default function UsersPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'client_admin',
    client_id: '',
    user_id: '',
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  const loadClients = async () => {
    try {
      setLoadingClients(true);
      const res = await api.get('/platform/clients');
      setClients(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load clients');
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/superadmin/register-admin', {
        ...formData,
        client_id: formData.client_id ? Number(formData.client_id) : null,
      });
      toast.success('User registered successfully');
      setFormData({
        email: '',
        full_name: '',
        password: '',
        role: 'client_admin',
        client_id: '',
        user_id: '',
      });
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.error || 'Failed to register user';
      toast.error(message);
    }
  };

  const deleteClient = async (id: number) => {
    try {
      await api.delete(`/platform/clients/${id}`);
      toast.success('Client deleted');
      loadClients();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete client');
    }
  };

  return (
    <SuperAdminShell
      title="Users"
      subtitle="Provision platform users with precise roles and tenant scope."
    >
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Register User</div>
          <h3 className="mt-2 text-lg font-semibold">Provision Account</h3>
          <div className="mt-5 grid gap-4">
            <div className="space-y-2">
              <FieldLabel>Full Name</FieldLabel>
              <input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Jane Doe"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Email</FieldLabel>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jane@spectropy.com"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Password</FieldLabel>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="********"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>Role</FieldLabel>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="client_admin">Client Admin</option>
                  <option value="content_authorizer">Content Authorizer</option>
                  <option value="school_owner">School Owner</option>
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                </select>
              </div>
              <div className="space-y-2">
                <FieldLabel>Client (Optional)</FieldLabel>
                <select
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Select client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <FieldLabel>User ID (Optional)</FieldLabel>
              <input
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                placeholder="External user ID"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <PrimaryButton type="submit">Create User</PrimaryButton>
          </div>
        </form>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Clients</h2>
              <p className="text-sm text-slate-500">
                Current tenants on the platform.
              </p>
            </div>
            <GhostButton onClick={() => navigate('/superadmin/clients')}>
              Open
            </GhostButton>
          </div>

          <div className="mt-5 max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {loadingClients && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                Loading clients...
              </div>
            )}
            {!loadingClients && clients.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                No clients found.
              </div>
            )}
            {!loadingClients &&
              clients.map((client) => (
                <div
                  key={client.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{client.name}</div>
                    <div className="text-xs text-slate-500">{client.slug}</div>
                    <div className="text-xs text-slate-500">Timezone: {client.timezone}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <GhostButton onClick={() => navigate('/superadmin/clients')}>Open</GhostButton>
                    <GhostButton onClick={() => deleteClient(client.id)}>Delete</GhostButton>
                  </div>
                </div>
              ))}
          </div>
        </section>
      </div>
    </SuperAdminShell>
  );
}
