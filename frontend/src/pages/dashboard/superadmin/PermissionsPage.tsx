import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import SuperAdminShell from './components/SuperAdminShell';
import { FieldLabel, GhostButton, PrimaryButton } from './components/ui';
import type { Client, RolePermission } from './types';

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

const clientScopedRoles = ['client_admin', 'school_owner', 'teacher', 'student'];

export default function PermissionsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState('client_admin');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [customPermission, setCustomPermission] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const requiresClient = clientScopedRoles.includes(selectedRole);

  const loadClients = async () => {
    try {
      const res = await api.get('/platform/clients');
      setClients(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load clients');
    }
  };

  const loadPermissions = async (clientIdFilter?: string) => {
    try {
      setLoading(true);
      const query = clientIdFilter ? `?client_id=${clientIdFilter}` : '';
      const res = await api.get(`/org/role-permissions${query}`);
      setPermissions(res.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (requiresClient && !selectedClientId) {
      setPermissions([]);
      return;
    }
    loadPermissions(selectedClientId || undefined);
  }, [selectedClientId, selectedRole]);

  const filteredPermissions = useMemo(() => {
    return permissions.filter((perm) => {
      if (perm.role !== selectedRole) return false;
      if (!selectedClientId) return perm.client_id === null;
      return perm.client_id === Number(selectedClientId);
    });
  }, [permissions, selectedRole, selectedClientId]);

  const permissionMap = useMemo(() => {
    const map = new Map<string, RolePermission>();
    filteredPermissions.forEach((perm) => {
      map.set(perm.permission, perm);
    });
    return map;
  }, [filteredPermissions]);

  const permissionKeys = useMemo(() => {
    const keys = new Set<string>(permissionOptions);
    filteredPermissions.forEach((perm) => keys.add(perm.permission));
    return Array.from(keys);
  }, [filteredPermissions]);

  const handleToggle = async (permission: string, nextValue: boolean) => {
    if (requiresClient && !selectedClientId) {
      toast.error('Select a client for this role');
      return;
    }

    const existing = permissionMap.get(permission);

    try {
      setSaving(permission);

      if (nextValue) {
        if (existing?.granted) {
          return;
        }
        if (existing && !existing.granted) {
          await api.delete(`/org/role-permissions/${existing.id}`);
        }
        const payload: Record<string, unknown> = {
          role: selectedRole,
          permission,
          granted: true,
        };
        if (selectedClientId) {
          payload.client_id = Number(selectedClientId);
        }
        await api.post('/org/role-permissions', payload);
        toast.success('Permission granted');
      } else {
        if (!existing) {
          return;
        }
        await api.delete(`/org/role-permissions/${existing.id}`);
        toast.success('Permission removed');
      }

      await loadPermissions(selectedClientId || undefined);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update permission');
    } finally {
      setSaving(null);
    }
  };

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customPermission.trim();
    if (!trimmed) return;
    if (requiresClient && !selectedClientId) {
      toast.error('Select a client for this role');
      return;
    }

    try {
      setSaving(trimmed);
      const payload: Record<string, unknown> = {
        role: selectedRole,
        permission: trimmed,
        granted: true,
      };
      if (selectedClientId) {
        payload.client_id = Number(selectedClientId);
      }
      await api.post('/org/role-permissions', payload);
      setCustomPermission('');
      await loadPermissions(selectedClientId || undefined);
      toast.success('Permission created');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create permission');
    } finally {
      setSaving(null);
    }
  };

  const toggleDisabled = requiresClient && !selectedClientId;

  return (
    <SuperAdminShell
      title="Permissions"
      subtitle="Toggle permissions by role and client scope."
      actions={
        <div className="flex items-center gap-2">
          <GhostButton onClick={() => loadPermissions(selectedClientId || undefined)}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </GhostButton>
          <PrimaryButton
            type="button"
            disabled={toggleDisabled}
            onClick={() => setAddOpen(true)}
            className="w-auto px-4 py-2 text-xs"
          >
            Add Permission
          </PrimaryButton>
        </div>
      }
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel>Select Role</FieldLabel>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="client_admin">Client Admin</option>
              <option value="school_owner">School Owner</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
              <option value="content_authorizer">Content Authorizer</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div className="space-y-2">
            <FieldLabel>Select Client</FieldLabel>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Platform (no client)</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {toggleDisabled && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            This role requires a client scope. Select a client to toggle permissions.
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {permissionKeys.map((permission) => {
            const existing = permissionMap.get(permission);
            const enabled = Boolean(existing?.granted);
            const isSaving = saving === permission;

            return (
              <div
                key={permission}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">{permission}</div>
                  <div className="text-xs text-slate-500">{enabled ? 'Granted' : 'Not granted'}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle(permission, !enabled)}
                  disabled={toggleDisabled || isSaving}
                  aria-pressed={enabled}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    enabled ? 'bg-emerald-500' : 'bg-slate-200'
                  } ${toggleDisabled || isSaving ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      enabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {addOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAddOpen(false)} />
          <div className="absolute left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Create Permission
                </div>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">Add Custom Permission</h3>
              </div>
              <button
                onClick={() => setAddOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateCustom} className="mt-5 space-y-4">
              <div className="space-y-2">
                <FieldLabel>Permission Name</FieldLabel>
                <input
                  value={customPermission}
                  onChange={(e) => setCustomPermission(e.target.value)}
                  placeholder="e.g. reports.export"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  autoFocus
                />
              </div>
              <PrimaryButton type="submit" disabled={!customPermission.trim()}>
                Create Permission
              </PrimaryButton>
              <p className="text-xs text-slate-500">
                New permissions appear in the toggle list after creation.
              </p>
            </form>
          </div>
        </div>
      )}
    </SuperAdminShell>
  );
}
