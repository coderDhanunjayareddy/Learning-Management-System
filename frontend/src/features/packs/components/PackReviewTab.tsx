import Pagination from '@/components/ui/Pagination';
import { Badge, GhostButton } from '@/pages/dashboard/superadmin/components/ui';
import type { PackCompositionSummary, PackItemPreview, PackSummary, PaginatedResponse } from '../types';
import { formatCourseMeta, prettyPackItemType } from '../packUi';

interface PackReviewTabProps {
  selectedPack: PackSummary | null;
  packItems: PaginatedResponse<PackItemPreview> | null;
  packItemsLoading: boolean;
  packItemsError: string | null;
  pendingRemoveIds: number[];
  onRemoveItem: (item: PackItemPreview) => void;
  onPackItemsPageChange: (page: number) => void;
  packSummary: PackCompositionSummary | null;
  packSummaryLoading: boolean;
  packSummaryError: string | null;
  collapsedGroups: string[];
  onToggleGroup: (groupKey: string) => void;
}

const EmptyState = ({ message }: { message: string }) => (
  <div className="border-b border-dashed border-slate-200 py-5 text-sm text-slate-500">{message}</div>
);

export default function PackReviewTab({
  selectedPack,
  packItems,
  packItemsLoading,
  packItemsError,
  pendingRemoveIds,
  onRemoveItem,
  onPackItemsPageChange,
  packSummary,
  packSummaryLoading,
  packSummaryError,
  collapsedGroups,
  onToggleGroup,
}: PackReviewTabProps) {
  if (!selectedPack) {
    return (
      <section className="border-b border-dashed border-slate-300 py-12 text-center">
        <h3 className="text-lg font-semibold text-slate-900">No pack selected for review</h3>
        <p className="mt-2 text-sm text-slate-500">
          Choose a pack first, then come here to inspect attached items and grouped composition.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-10 xl:grid-cols-[1fr_0.95fr] xl:gap-0 xl:divide-x xl:divide-slate-200">
      <section className="space-y-5 xl:pr-8">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Attached Items</h3>
            <p className="mt-1 text-sm text-slate-500">Review each item currently inside the selected pack.</p>
          </div>
          <Badge tone="border-slate-200 bg-slate-50 text-slate-700">{selectedPack.item_count} attached</Badge>
        </div>

        <div className="space-y-0">
          {packItemsLoading && <EmptyState message="Loading pack items..." />}
          {packItemsError && (
            <div className="border-l-2 border-rose-300 pl-4 text-sm text-rose-600">{packItemsError}</div>
          )}
          {!packItemsLoading && !packItemsError && packItems?.data.length === 0 && (
            <EmptyState message="This pack does not contain any items yet." />
          )}
          {!packItemsLoading &&
            !packItemsError &&
            packItems?.data.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 border-b border-slate-200 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="border-slate-200 bg-slate-50 text-slate-700">
                      {prettyPackItemType(item.item_type)}
                    </Badge>
                    <span className="truncate text-sm font-semibold text-slate-900">{item.title}</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {item.course_name} | {formatCourseMeta(item.grade, item.subject)}
                  </div>
                </div>
                <GhostButton
                  onClick={() => onRemoveItem(item)}
                  disabled={pendingRemoveIds.includes(item.id)}
                  className="!rounded-full !px-3 !py-2"
                >
                  {pendingRemoveIds.includes(item.id) ? 'Undo window...' : 'Remove'}
                </GhostButton>
              </div>
            ))}
        </div>

        {packItems && (
          <Pagination
            page={packItems.page}
            pageSize={packItems.page_size}
            total={packItems.total}
            onPageChange={onPackItemsPageChange}
          />
        )}
      </section>

      <section className="space-y-5 xl:pl-8">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Grouped Summary</h3>
            <p className="mt-1 text-sm text-slate-500">Check coverage by course and subject before you ship the pack.</p>
          </div>
          {packSummary && (
            <Badge tone="border-emerald-200 bg-emerald-50 text-emerald-700">{packSummary.total_items} total</Badge>
          )}
        </div>

        <div className="space-y-0">
          {packSummaryLoading && <EmptyState message="Loading summary..." />}
          {packSummaryError && (
            <div className="border-l-2 border-rose-300 pl-4 text-sm text-rose-600">{packSummaryError}</div>
          )}
          {!packSummaryLoading && !packSummaryError && packSummary?.groups.length === 0 && (
            <EmptyState message="No grouped content to summarize yet." />
          )}
          {!packSummaryLoading &&
            !packSummaryError &&
            packSummary?.groups.map((group) => {
              const groupKey = `${group.course_id}:${group.subject ?? ''}`;
              const collapsed = collapsedGroups.includes(groupKey);

              return (
                <div key={groupKey} className="border-b border-slate-200 py-4">
                  <button
                    type="button"
                    onClick={() => onToggleGroup(groupKey)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{group.course_name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatCourseMeta(group.grade, group.subject)}
                      </div>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {group.item_count} items {collapsed ? '+' : '-'}
                    </span>
                  </button>

                  {!collapsed && (
                    <div className="mt-4 space-y-3">
                      {group.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-slate-700">{item.title}</span>
                          <Badge tone="border-slate-200 bg-slate-50 text-slate-700">
                            {prettyPackItemType(item.item_type)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </section>
    </div>
  );
}
