import { Badge, GhostButton } from '@/pages/dashboard/superadmin/components/ui';
import type { PackCompositionSummary, PackItemPreview, PackSummary } from '../types';
import { formatCourseMeta, prettyPackItemType } from '../packUi';

interface PackOverviewTabProps {
  selectedPack: PackSummary | null;
  packItems: PackItemPreview[] | null;
  packItemsLoading: boolean;
  packItemsError: string | null;
  packSummary: PackCompositionSummary | null;
  packSummaryLoading: boolean;
  packSummaryError: string | null;
  onOpenBuilder: () => void;
  onOpenReview: () => void;
}

const EmptyState = ({ message }: { message: string }) => (
  <div className="border-b border-dashed border-slate-200 py-5 text-sm text-slate-500">{message}</div>
);

export default function PackOverviewTab({
  selectedPack,
  packItems,
  packItemsLoading,
  packItemsError,
  packSummary,
  packSummaryLoading,
  packSummaryError,
  onOpenBuilder,
  onOpenReview,
}: PackOverviewTabProps) {
  if (!selectedPack) {
    return (
      <section className="border-b border-dashed border-slate-300 py-12 text-center">
        <h3 className="text-lg font-semibold text-slate-900">Select a pack to get started</h3>
        <p className="mt-2 text-sm text-slate-500">
          Once a pack is selected, this overview will show the pack health, quick actions, and a preview of its content composition.
        </p>
      </section>
    );
  }

  const recentItems = packItems?.slice(0, 5) ?? [];
  const summaryGroups = packSummary?.groups.slice(0, 3) ?? [];

  return (
    <div className="space-y-10">
      <section className="border-b border-slate-200 pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Pack Overview</div>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{selectedPack.name}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {selectedPack.description?.trim() || 'No description added yet.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <GhostButton onClick={onOpenBuilder} className="!rounded-full !px-4 !py-2 !text-sm">
              Open Builder
            </GhostButton>
            <GhostButton onClick={onOpenReview} className="!rounded-full !px-4 !py-2 !text-sm">
              Open Review
            </GhostButton>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-600">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Items</div>
            <div className="mt-1 text-lg font-semibold text-slate-950">{selectedPack.item_count}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Courses</div>
            <div className="mt-1 text-lg font-semibold text-slate-950">{selectedPack.course_count}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Summary Groups</div>
            <div className="mt-1 text-lg font-semibold text-slate-950">{packSummary?.groups.length ?? 0}</div>
          </div>
        </div>
      </section>

      <div className="grid gap-10 xl:grid-cols-[1.2fr_0.8fr] xl:gap-0 xl:divide-x xl:divide-slate-200">
        <section className="space-y-5 xl:pr-8">
          <div className="border-b border-slate-200 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold text-slate-950">Pack Health</h4>
                <p className="mt-1 text-sm text-slate-500">A quick checklist before you keep building.</p>
              </div>
              <Badge tone="border-slate-200 bg-slate-50 text-slate-700">Checklist</Badge>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-4">
              <div className="text-sm font-semibold text-slate-900">
                {selectedPack.item_count > 0 ? 'Pack has content' : 'Pack is still empty'}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {selectedPack.item_count > 0
                  ? 'Good start. You already have content attached to this pack.'
                  : 'Use the Builder tab to attach a whole course or choose specific items.'}
              </p>
            </div>
            <div className="border-b border-slate-200 pb-4">
              <div className="text-sm font-semibold text-slate-900">
                {selectedPack.course_count > 0 ? 'Pack covers source courses' : 'No source course linked yet'}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {selectedPack.course_count > 0
                  ? 'Your pack already pulls content from one or more platform courses.'
                  : 'Attach a platform course to create a meaningful starting point.'}
              </p>
            </div>
            <div className="border-b border-slate-200 pb-4">
              <div className="text-sm font-semibold text-slate-900">
                {packSummary && packSummary.groups.length > 0
                  ? 'Summary looks ready'
                  : 'Summary will appear after content is added'}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Review groups by course and subject before handing this pack to downstream users.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-5 xl:pl-8">
          <div className="border-b border-slate-200 pb-4">
            <h4 className="text-lg font-semibold text-slate-950">Recent Attached Items</h4>
            <p className="mt-1 text-sm text-slate-500">A quick snapshot of what is currently inside the pack.</p>
          </div>

          <div className="space-y-0">
            {packItemsLoading && <EmptyState message="Loading items..." />}
            {packItemsError && (
              <div className="border-l-2 border-rose-300 pl-4 text-sm text-rose-600">{packItemsError}</div>
            )}
            {!packItemsLoading && !packItemsError && recentItems.length === 0 && (
              <EmptyState message="No items have been attached yet." />
            )}
            {!packItemsLoading &&
              !packItemsError &&
              recentItems.map((item) => (
                <div key={item.id} className="border-b border-slate-200 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="border-slate-200 bg-slate-50 text-slate-700">
                      {prettyPackItemType(item.item_type)}
                    </Badge>
                    <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {item.course_name} | {formatCourseMeta(item.grade, item.subject)}
                  </div>
                </div>
              ))}
          </div>
        </section>
      </div>

      <section className="border-t border-slate-200 pt-8">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h4 className="text-lg font-semibold text-slate-950">Composition Preview</h4>
            <p className="mt-1 text-sm text-slate-500">Top groups so you can quickly spot coverage gaps.</p>
          </div>
          {packSummary && (
            <Badge tone="border-emerald-200 bg-emerald-50 text-emerald-700">{packSummary.total_items} total</Badge>
          )}
        </div>

        <div className="space-y-0 pt-4">
          {packSummaryLoading && <EmptyState message="Loading summary..." />}
          {packSummaryError && (
            <div className="border-l-2 border-rose-300 pl-4 text-sm text-rose-600">{packSummaryError}</div>
          )}
          {!packSummaryLoading && !packSummaryError && summaryGroups.length === 0 && (
            <EmptyState message="Summary groups will appear after content is added." />
          )}
          {!packSummaryLoading &&
            !packSummaryError &&
            summaryGroups.map((group) => (
              <div key={`${group.course_id}:${group.subject ?? ''}`} className="border-b border-slate-200 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{group.course_name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatCourseMeta(group.grade, group.subject)}
                    </div>
                  </div>
                  <Badge tone="border-slate-200 bg-slate-50 text-slate-700">{group.item_count} items</Badge>
                </div>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
