import PackBuilderWorkspace from '@/features/packs/components/PackBuilderWorkspace';
import SuperAdminShell from './components/SuperAdminShell';

export default function PacksPage() {
  return (
    <SuperAdminShell
      title="Pack Builder"
      subtitle="Create platform courses, attach content items to packs, and review grouped composition."
    >
      <PackBuilderWorkspace />
    </SuperAdminShell>
  );
}
