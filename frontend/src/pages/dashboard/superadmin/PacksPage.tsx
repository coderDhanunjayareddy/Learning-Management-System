import PackListWorkspace from '@/features/packs/components/PackListWorkspace';
import SuperAdminShell from './components/SuperAdminShell';

export default function PacksPage() {
  return (
    <SuperAdminShell
      title="Content Packs"
      subtitle="Create, edit, deactivate, and assign pack-level entitlements from one list view."
    >
      <PackListWorkspace basePath="/superadmin/packs" />
    </SuperAdminShell>
  );
}
