import PackListWorkspace from '@/features/packs/components/PackListWorkspace';
import ContentAuthorizerShell from './ContentAuthorizerShell';

export default function ContentAuthorizerPacksPage() {
  return (
    <ContentAuthorizerShell
      title="Content Packs"
      subtitle="Create, edit, deactivate, and assign pack-level entitlements from one list view."
    >
      <PackListWorkspace basePath="/content-authorizer/packs" />
    </ContentAuthorizerShell>
  );
}
