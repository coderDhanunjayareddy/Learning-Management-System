import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import SuperAdminShell from './components/SuperAdminShell';
import { ActionCard, Badge, StatCard } from './components/ui';
import type { Client, ContentPack, Entitlement } from './types';

const statusTone: Record<string, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  grace: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  expired: 'border-rose-200 bg-rose-50 text-rose-700',
};

export default function PlatformDashboard() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [packs, setPacks] = useState<ContentPack[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [loading, setLoading] = useState(false);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const [clientRes, packRes, entitlementRes] = await Promise.all([
        api.get('/platform/clients'),
        api.get('/platform/content-packs'),
        api.get('/platform/entitlements'),
      ]);
      setClients(clientRes.data);
      setPacks(packRes.data);
      setEntitlements(entitlementRes.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load platform overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const clientStats = useMemo(() => {
    const active = clients.filter((client) => client.is_active).length;
    return { total: clients.length, active };
  }, [clients]);

  const packStats = useMemo(() => {
    const active = packs.filter((pack) => pack.is_active).length;
    return { total: packs.length, active };
  }, [packs]);

  const entitlementStats = useMemo(() => {
    const counts = entitlements.reduce(
      (acc, entitlement) => {
        acc.total += 1;
        const status = entitlement.status || 'active';
        acc.byStatus[status] = (acc.byStatus[status] || 0) + 1;
        return acc;
      },
      { total: 0, byStatus: {} as Record<string, number> },
    );
    return counts;
  }, [entitlements]);

  const recentEntitlements = useMemo(() => entitlements.slice(0, 5), [entitlements]);

  const quickActions = [
    {
      title: 'Create Client',
      description: 'Set up a new tenant and configure its timezone.',
      actionLabel: 'Go to Clients',
      onAction: () => navigate('/superadmin/clients'),
    },
    {
      title: 'Create Content Pack',
      description: 'Bundle content into subscription-ready packs.',
      actionLabel: 'Go to Packs',
      onAction: () => navigate('/superadmin/packs'),
    },
    {
      title: 'Grant Entitlement',
      description: 'Define access windows for packs or individual content.',
      actionLabel: 'Go to Entitlements',
      onAction: () => navigate('/superadmin/entitlements'),
    },
    {
      title: 'Register User',
      description: 'Provision admin or school staff accounts.',
      actionLabel: 'Go to Users',
      onAction: () => navigate('/superadmin/users'),
    },
  ];

  return (
    <SuperAdminShell
      title="Overview"
      subtitle="Monitor tenants, entitlements, and access controls across the platform."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Clients" value={clientStats.total} caption={`${clientStats.active} active`} />
        <StatCard label="Content Packs" value={packStats.total} caption={`${packStats.active} active`} />
        <StatCard
          label="Entitlements"
          value={entitlementStats.total}
          caption={`${entitlementStats.byStatus.active || 0} active`}
        />
        <StatCard label="Permissions" value="--" caption="Open Permissions to view" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Quick Actions</h2>
              <p className="text-sm text-slate-500">Jump into the most common admin tasks.</p>
            </div>
            <button
              type="button"
              onClick={loadOverview}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {quickActions.map((action) => (
              <ActionCard
                key={action.title}
                title={action.title}
                description={action.description}
                actionLabel={action.actionLabel}
                onAction={action.onAction}
              />
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Recent Entitlements</h2>
          <p className="text-sm text-slate-500">Latest access grants across tenants.</p>
          <div className="mt-5 space-y-3">
            {loading && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                Loading entitlements...
              </div>
            )}
            {!loading && recentEntitlements.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                No entitlements available yet.
              </div>
            )}
            {!loading &&
              recentEntitlements.map((entitlement) => (
                <div
                  key={entitlement.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {entitlement.client_name || `Client ${entitlement.client_id}`}
                    </div>
                    <div className="text-xs text-slate-500">
                      Pack: {entitlement.pack_name || entitlement.pack_id || '-'}
                    </div>
                  </div>
                  <Badge tone={statusTone[entitlement.status] || statusTone.active}>{entitlement.status}</Badge>
                </div>
              ))}
          </div>
        </div>
      </div>
    </SuperAdminShell>
  );
}
