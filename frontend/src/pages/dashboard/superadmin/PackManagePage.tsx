import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GhostButton } from './components/ui';
import SuperAdminShell from './components/SuperAdminShell';
import PackBuilderWorkspace from '@/features/packs/components/PackBuilderWorkspace';

export default function PackManagePage() {
  const navigate = useNavigate();
  const { packId } = useParams();
  const parsedPackId = useMemo(() => Number(packId), [packId]);
  const isInvalidPackId = !Number.isInteger(parsedPackId) || parsedPackId <= 0;

  return (
    <SuperAdminShell
      title="Manage Pack"
      subtitle="Review attached items, browse courses, and update pack composition."
      actions={
        <GhostButton onClick={() => navigate('/superadmin/packs')} className="!rounded-xl !px-4 !py-2 !text-sm">
          Back to Packs
        </GhostButton>
      }
    >
      {isInvalidPackId ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
          Invalid pack id.
        </div>
      ) : (
        <PackBuilderWorkspace packId={parsedPackId} />
      )}
    </SuperAdminShell>
  );
}
