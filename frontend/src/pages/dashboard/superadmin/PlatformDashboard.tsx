import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Link } from 'react-router-dom';
import spectropyLogo from '/logo.png';

type TabKey = 'clients' | 'packs' | 'entitlements' | 'users' | 'permissions';

interface Client {
  id: number;
  name: string;
  slug: string;
  timezone: string;
  is_active: boolean;
}

interface ContentPack {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface Entitlement {
  id: number;
  client_id: number;
  content_id: number | null;
  pack_id: number | null;
  start_at: string;
  end_at: string;
  status: string;
  client_name?: string;
  pack_name?: string;
  content_title?: string;
}

interface RolePermission {
  id: number;
  client_id: number | null;
  role: string;
  permission: string;
  granted: boolean;
}

export default function PlatformDashboard() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('clients');

  const [clients, setClients] = useState<Client[]>([]);
  const [packs, setPacks] = useState<ContentPack[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);

  const [clientForm, setClientForm] = useState({ name: '', slug: '', timezone: 'Asia/Kolkata' });
  const [packForm, setPackForm] = useState({ name: '', description: '' });
  const [entitlementForm, setEntitlementForm] = useState({
    client_id: '',
    content_id: '',
    pack_id: '',
    start_at: '',
    end_at: '',
    status: 'active',
  });
  const [userForm, setUserForm] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'client_admin',
    client_id: '',
    user_id: '',
  });
  const [permissionFilterClientId, setPermissionFilterClientId] = useState('');
  const [permissionForm, setPermissionForm] = useState({
    role: 'client_admin',
    permission: 'subjects.read',
    granted: true,
    client_id: '',
  });

  const isFormValid = useMemo(() => clientForm.name.trim() && clientForm.slug.trim(), [clientForm]);
  const permissionOptions = [
    'subjects.read',
    'subjects.create',
    'subjects.update',
    'subjects.delete',
    'chapters.read',
    'chapters.create',
    'chapters.update',
    'chapters.delete',
    'topics.read',
    'topics.create',
    'topics.update',
    'topics.delete',
    'courses.read',
    'courses.create',
    'courses.update',
    'courses.delete',
    'courses.publish',
  ];

  const loadClients = async () => {
    const res = await api.get('/platform/clients');
    setClients(res.data);
  };

  const loadPacks = async () => {
    const res = await api.get('/platform/content-packs');
    setPacks(res.data);
  };

  const loadEntitlements = async () => {
    const res = await api.get('/platform/entitlements');
    setEntitlements(res.data);
  };

  const loadPermissions = async (clientIdFilter?: string) => {
    const query = clientIdFilter ? `?client_id=${clientIdFilter}` : '';
    const res = await api.get(`/org/role-permissions${query}`);
    setPermissions(res.data);
  };

  useEffect(() => {
    loadClients();
    loadPacks();
    loadEntitlements();
  }, []);

  useEffect(() => {
    if (activeTab !== 'permissions') return;
    loadPermissions(permissionFilterClientId || undefined);
  }, [activeTab, permissionFilterClientId]);

  const createClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    await api.post('/platform/clients', clientForm);
    setClientForm({ name: '', slug: '', timezone: 'Asia/Kolkata' });
    loadClients();
  };

  const deactivateClient = async (id: number) => {
    await api.delete(`/platform/clients/${id}`);
    loadClients();
  };

  const createPack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packForm.name.trim()) return;
    await api.post('/platform/content-packs', packForm);
    setPackForm({ name: '', description: '' });
    loadPacks();
  };

  const deactivatePack = async (id: number) => {
    await api.delete(`/platform/content-packs/${id}`);
    loadPacks();
  };

  const createEntitlement = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/platform/entitlements', {
      ...entitlementForm,
      client_id: Number(entitlementForm.client_id),
      content_id: entitlementForm.content_id ? Number(entitlementForm.content_id) : null,
      pack_id: entitlementForm.pack_id ? Number(entitlementForm.pack_id) : null,
    });
    setEntitlementForm({
      client_id: '',
      content_id: '',
      pack_id: '',
      start_at: '',
      end_at: '',
      status: 'active',
    });
    loadEntitlements();
  };

  const revokeEntitlement = async (id: number) => {
    await api.delete(`/platform/entitlements/${id}`);
    loadEntitlements();
  };

  const registerUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/superadmin/register-admin', userForm);
    setUserForm({
      email: '',
      full_name: '',
      password: '',
      role: 'client_admin',
      client_id: '',
      user_id: '',
    });
  };

  const createPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    const requiresClientId = ['client_admin', 'school_owner', 'teacher', 'student'].includes(permissionForm.role);
    if (requiresClientId && !permissionForm.client_id) {
      return;
    }
    if (!permissionForm.permission.trim()) return;

    const payload: Record<string, unknown> = {
      role: permissionForm.role,
      permission: permissionForm.permission.trim(),
      granted: Boolean(permissionForm.granted),
    };

    if (permissionForm.client_id) {
      payload.client_id = Number(permissionForm.client_id);
    }

    await api.post('/org/role-permissions', payload);
    setPermissionForm((prev) => ({ ...prev, permission: 'subjects.read', granted: true }));
    loadPermissions(permissionFilterClientId || undefined);
  };

  const deletePermission = async (id: number) => {
    await api.delete(`/org/role-permissions/${id}`);
    loadPermissions(permissionFilterClientId || undefined);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/superadmin/dashboard" className="flex items-center gap-3">
            <img src={spectropyLogo} alt="Spectropy" className="h-10 w-auto object-contain" />
            <div className="leading-tight">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Spectropy</div>
              <div className="text-lg font-semibold">Platform Console</div>
            </div>
          </Link>
          <button
            onClick={logout}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap gap-3">
          {[
            { key: 'clients', label: 'Clients' },
            { key: 'packs', label: 'Content Packs' },
            { key: 'entitlements', label: 'Entitlements' },
            { key: 'users', label: 'Users' },
            { key: 'permissions', label: 'Permissions' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                activeTab === tab.key ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'clients' && (
          <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Clients</h2>
              <div className="mt-4 space-y-3">
                {clients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                    <div>
                      <div className="font-semibold">{client.name}</div>
                      <div className="text-xs text-slate-500">{client.slug}</div>
                    </div>
                    <button
                      onClick={() => deactivateClient(client.id)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                    >
                      {client.is_active ? 'Deactivate' : 'Inactive'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <form onSubmit={createClient} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Create Client</h3>
              <div className="mt-4 space-y-3">
                <input
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  placeholder="Client name"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  value={clientForm.slug}
                  onChange={(e) => setClientForm({ ...clientForm, slug: e.target.value })}
                  placeholder="Client slug"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  value={clientForm.timezone}
                  onChange={(e) => setClientForm({ ...clientForm, timezone: e.target.value })}
                  placeholder="Timezone"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  Create Client
                </button>
              </div>
            </form>
          </section>
        )}

        {activeTab === 'packs' && (
          <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Content Packs</h2>
              <div className="mt-4 space-y-3">
                {packs.map((pack) => (
                  <div key={pack.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                    <div>
                      <div className="font-semibold">{pack.name}</div>
                      <div className="text-xs text-slate-500">{pack.description || 'No description'}</div>
                    </div>
                    <button
                      onClick={() => deactivatePack(pack.id)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                    >
                      {pack.is_active ? 'Deactivate' : 'Inactive'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <form onSubmit={createPack} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Create Pack</h3>
              <div className="mt-4 space-y-3">
                <input
                  value={packForm.name}
                  onChange={(e) => setPackForm({ ...packForm, name: e.target.value })}
                  placeholder="Pack name"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <textarea
                  value={packForm.description}
                  onChange={(e) => setPackForm({ ...packForm, description: e.target.value })}
                  placeholder="Description"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  rows={4}
                />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  Create Pack
                </button>
              </div>
            </form>
          </section>
        )}

        {activeTab === 'entitlements' && (
          <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Entitlements</h2>
              <div className="mt-4 space-y-3">
                {entitlements.map((ent) => (
                  <div key={ent.id} className="rounded-xl border border-slate-100 p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{ent.client_name || `Client ${ent.client_id}`}</div>
                      <button
                        onClick={() => revokeEntitlement(ent.id)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                      >
                        Revoke
                      </button>
                    </div>
                    <div className="text-xs text-slate-500">
                      Pack: {ent.pack_name || '-'} | Content: {ent.content_title || '-'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {ent.start_at} â†’ {ent.end_at} ({ent.status})
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <form onSubmit={createEntitlement} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Grant Entitlement</h3>
              <div className="mt-4 space-y-3">
                <input
                  value={entitlementForm.client_id}
                  onChange={(e) => setEntitlementForm({ ...entitlementForm, client_id: e.target.value })}
                  placeholder="Client ID"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  value={entitlementForm.pack_id}
                  onChange={(e) => setEntitlementForm({ ...entitlementForm, pack_id: e.target.value })}
                  placeholder="Pack ID (optional)"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  value={entitlementForm.content_id}
                  onChange={(e) => setEntitlementForm({ ...entitlementForm, content_id: e.target.value })}
                  placeholder="Content ID (optional)"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  type="datetime-local"
                  value={entitlementForm.start_at}
                  onChange={(e) => setEntitlementForm({ ...entitlementForm, start_at: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  type="datetime-local"
                  value={entitlementForm.end_at}
                  onChange={(e) => setEntitlementForm({ ...entitlementForm, end_at: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <select
                  value={entitlementForm.status}
                  onChange={(e) => setEntitlementForm({ ...entitlementForm, status: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="active">active</option>
                  <option value="pending">pending</option>
                  <option value="grace">grace</option>
                  <option value="expired">expired</option>
                </select>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  Grant Entitlement
                </button>
              </div>
            </form>
          </section>
        )}

        {activeTab === 'users' && (
          <section className="mt-8 max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Register User</h2>
            <form onSubmit={registerUser} className="mt-4 space-y-3">
              <input
                value={userForm.full_name}
                onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                placeholder="Full name"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="Email"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                placeholder="Password"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="client_admin">Client Admin</option>
                <option value="content_authorizer">Content Authorizer</option>
                <option value="school_owner">School Owner</option>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
              <input
                value={userForm.client_id}
                onChange={(e) => setUserForm({ ...userForm, client_id: e.target.value })}
                placeholder="Client ID (optional)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={userForm.user_id}
                onChange={(e) => setUserForm({ ...userForm, user_id: e.target.value })}
                placeholder="User ID (optional)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-blue-900 px-3 py-2 text-sm font-semibold text-white"
              >
                Create User
              </button>
            </form>
          </section>
        )}

        {activeTab === 'permissions' && (
          <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Role Permissions</h2>
                <div className="flex items-center gap-2">
                  <input
                    value={permissionFilterClientId}
                    onChange={(e) => setPermissionFilterClientId(e.target.value)}
                    placeholder="Filter client_id"
                    className="w-40 rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                  <button
                    onClick={() => loadPermissions(permissionFilterClientId || undefined)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                  >
                    Refresh
                  </button>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {permissions.map((perm) => (
                  <div key={perm.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                    <div>
                      <div className="text-sm font-semibold">
                        {perm.role} â†’ {perm.permission}
                      </div>
                      <div className="text-xs text-slate-500">
                        Scope: {perm.client_id ?? 'platform'} | Granted: {perm.granted ? 'true' : 'false'}
                      </div>
                    </div>
                    <button
                      onClick={() => deletePermission(perm.id)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {permissions.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                    No permissions found.
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={createPermission} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Grant Permission</h3>
              <div className="mt-4 space-y-3">
                <select
                  value={permissionForm.role}
                  onChange={(e) => setPermissionForm({ ...permissionForm, role: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="client_admin">Client Admin</option>
                  <option value="school_owner">School Owner</option>
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                  <option value="content_authorizer">Content Authorizer</option>
                </select>
                <input
                  list="permission-options"
                  value={permissionForm.permission}
                  onChange={(e) => setPermissionForm({ ...permissionForm, permission: e.target.value })}
                  placeholder="Permission (e.g. subjects.read)"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <datalist id="permission-options">
                  {permissionOptions.map((perm) => (
                    <option key={perm} value={perm} />
                  ))}
                </datalist>
                <input
                  value={permissionForm.client_id}
                  onChange={(e) => setPermissionForm({ ...permissionForm, client_id: e.target.value })}
                  placeholder="Client ID (required for client roles)"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <select
                  value={permissionForm.granted ? 'true' : 'false'}
                  onChange={(e) => setPermissionForm({ ...permissionForm, granted: e.target.value === 'true' })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="true">Granted</option>
                  <option value="false">Denied</option>
                </select>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-blue-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  Save Permission
                </button>
              </div>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}


