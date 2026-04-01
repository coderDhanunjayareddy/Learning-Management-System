import { useMemo } from 'react';
import Pagination from '@/components/ui/Pagination';
import { Badge, GhostButton, PrimaryButton } from '@/pages/dashboard/superadmin/components/ui';
import type {
  CourseContentPreviewItem,
  CourseSearchResult,
  PaginatedResponse,
  PackSummary,
} from '../types';
import { formatCourseMeta, prettyPackItemType } from '../packUi';

interface PackBuilderTabProps {
  selectedPack: PackSummary | null;
  courseQuery: string;
  onCourseQueryChange: (value: string) => void;
  onOpenCreateCourse: () => void;
  courseResults: CourseSearchResult[];
  coursesLoading: boolean;
  coursesError: string | null;
  selectedCourse: CourseSearchResult | null;
  onSelectCourse: (course: CourseSearchResult) => void;
  courseContent: PaginatedResponse<CourseContentPreviewItem> | null;
  courseContentLoading: boolean;
  courseContentError: string | null;
  courseContentPage: number;
  onCourseContentPageChange: (page: number) => void;
  selectedItemIds: number[];
  selectedCourseItems: CourseContentPreviewItem[];
  onToggleItemSelection: (itemId: number) => void;
  onClearSelection: () => void;
  addSubmitting: boolean;
  attachSubmitting: boolean;
  onAddSelectedItems: () => void;
  onAttachCourse: () => void;
}

type CourseTreeNode = CourseContentPreviewItem & {
  children: CourseTreeNode[];
};

function ContentTreeNode({
  node,
  depth,
  selectedItemIds,
  onToggleItemSelection,
}: {
  node: CourseTreeNode;
  depth: number;
  selectedItemIds: number[];
  onToggleItemSelection: (itemId: number) => void;
}) {
  const isSelected = selectedItemIds.includes(node.id);

  return (
    <div className="space-y-2">
      <label
        className="flex items-start gap-3 border-b border-slate-200 py-3"
        style={{ marginLeft: `${depth * 18}px` }}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleItemSelection(node.id)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-[#073b8a]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="border-slate-200 bg-slate-50 text-slate-700">
              {prettyPackItemType(node.item_type)}
            </Badge>
            <span className="truncate text-sm font-semibold text-slate-900">{node.title}</span>
            {node.children.length > 0 && (
              <span className="text-xs text-slate-400">{node.children.length} child items</span>
            )}
          </div>
          <div className="mt-2 text-xs text-slate-500">Order {node.order_index + 1}</div>
        </div>
      </label>

      {node.children.map((child) => (
        <ContentTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedItemIds={selectedItemIds}
          onToggleItemSelection={onToggleItemSelection}
        />
      ))}
    </div>
  );
}

const buildCourseTree = (items: CourseContentPreviewItem[]) => {
  const nodeMap = new Map<number, CourseTreeNode>();
  const roots: CourseTreeNode[] = [];

  items.forEach((item) => {
    nodeMap.set(item.id, { ...item, children: [] });
  });

  items.forEach((item) => {
    const node = nodeMap.get(item.id);
    if (!node) return;

    if (item.parent_id && nodeMap.has(item.parent_id)) {
      nodeMap.get(item.parent_id)?.children.push(node);
      return;
    }

    roots.push(node);
  });

  return roots;
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="border-b border-dashed border-slate-200 py-5 text-sm text-slate-500">{message}</div>
);

export default function PackBuilderTab({
  selectedPack,
  courseQuery,
  onCourseQueryChange,
  onOpenCreateCourse,
  courseResults,
  coursesLoading,
  coursesError,
  selectedCourse,
  onSelectCourse,
  courseContent,
  courseContentLoading,
  courseContentError,
  courseContentPage,
  onCourseContentPageChange,
  selectedItemIds,
  selectedCourseItems,
  onToggleItemSelection,
  onClearSelection,
  addSubmitting,
  attachSubmitting,
  onAddSelectedItems,
  onAttachCourse,
}: PackBuilderTabProps) {
  const courseTree = useMemo(() => buildCourseTree(courseContent?.data ?? []), [courseContent?.data]);

  return (
    <div className="grid gap-10 xl:grid-cols-[0.95fr_1.2fr_0.85fr] xl:gap-0 xl:divide-x xl:divide-slate-200">
      <section className="space-y-5 xl:pr-8">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Course Browser</h3>
            <p className="mt-1 text-sm text-slate-500">Search platform courses by name, grade, or subject.</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge tone="border-slate-200 bg-slate-50 text-slate-700">Global courses</Badge>
            <GhostButton onClick={onOpenCreateCourse} className="!rounded-full !px-4 !py-2 !text-sm">
              Create Course
            </GhostButton>
          </div>
        </div>

        <input
          value={courseQuery}
          onChange={(event) => onCourseQueryChange(event.target.value)}
          placeholder="Search courses"
          className="w-full border-b border-slate-300 bg-transparent px-0 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-900"
        />

        <div className="space-y-0">
          {coursesLoading && <EmptyState message="Loading courses..." />}
          {!coursesLoading && coursesError && (
            <div className="border-l-2 border-rose-300 pl-4 text-sm text-rose-600">{coursesError}</div>
          )}
          {!coursesLoading && !coursesError && courseResults.length === 0 && (
            <EmptyState message="No courses matched your search." />
          )}
          {!coursesLoading &&
            !coursesError &&
            courseResults.map((course) => {
              const isSelected = selectedCourse?.id === course.id;
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => onSelectCourse(course)}
                  className={`w-full border-b border-slate-200 px-1 py-4 text-left transition ${
                    isSelected ? 'bg-sky-50/70' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">{course.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {formatCourseMeta(course.grade, course.subject)}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-slate-500">{course.content_item_count}</div>
                  </div>
                </button>
              );
            })}
        </div>
      </section>

      <section className="space-y-5 xl:px-8">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Content Picker</h3>
            <p className="mt-1 text-sm text-slate-500">
              Select a course and choose the exact items you want to attach to the pack.
            </p>
          </div>
          {selectedItemIds.length > 0 && (
            <Badge tone="border-emerald-200 bg-emerald-50 text-emerald-700">
              {selectedItemIds.length} selected
            </Badge>
          )}
        </div>

        <div className="border-b border-slate-200 pb-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Selected Course</div>
          <div className="mt-2 text-base font-semibold text-slate-950">
            {selectedCourse?.name ?? 'Select a course first'}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {selectedCourse ? formatCourseMeta(selectedCourse.grade, selectedCourse.subject) : 'No course chosen yet'}
          </div>
        </div>

        <div className="space-y-0">
          {!selectedCourse && <EmptyState message="Pick a course from the left to browse its content." />}
          {selectedCourse && courseContentLoading && <EmptyState message="Loading course content..." />}
          {selectedCourse && courseContentError && (
            <div className="border-l-2 border-rose-300 pl-4 text-sm text-rose-600">{courseContentError}</div>
          )}
          {selectedCourse && !courseContentLoading && !courseContentError && courseTree.length === 0 && (
            <EmptyState message="This course does not contain any items yet." />
          )}
          {selectedCourse &&
            !courseContentLoading &&
            !courseContentError &&
            courseTree.map((node) => (
              <ContentTreeNode
                key={node.id}
                node={node}
                depth={0}
                selectedItemIds={selectedItemIds}
                onToggleItemSelection={onToggleItemSelection}
              />
            ))}
        </div>

        {selectedCourse && courseContent && (
          <Pagination
            page={courseContentPage}
            pageSize={courseContent.page_size}
            total={courseContent.total}
            onPageChange={onCourseContentPageChange}
          />
        )}
      </section>

      <section className="space-y-5 xl:pl-8">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Selection Summary</h3>
            <p className="mt-1 text-sm text-slate-500">Attach a full course or only the selected items.</p>
          </div>
          {selectedPack && (
            <Badge tone="border-slate-200 bg-slate-50 text-slate-700">{selectedPack.item_count} in pack</Badge>
          )}
        </div>

        <div className="border-b border-slate-200 pb-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Working Pack</div>
          <div className="mt-2 text-base font-semibold text-slate-950">
            {selectedPack?.name ?? 'Select a pack first'}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {selectedPack
              ? `${selectedPack.item_count} items already attached`
              : 'A pack is required before adding content'}
          </div>
        </div>

        <div className="space-y-3 border-b border-slate-200 pb-5">
          <GhostButton
            onClick={onAttachCourse}
            disabled={!selectedCourse || !selectedPack || attachSubmitting}
            className="!w-full !rounded-full !px-4 !py-3 !text-sm"
          >
            {attachSubmitting ? 'Attaching...' : 'Attach Entire Course'}
          </GhostButton>
          <PrimaryButton
            onClick={onAddSelectedItems}
            disabled={!selectedPack || selectedItemIds.length === 0 || addSubmitting}
          >
            {addSubmitting ? 'Adding...' : 'Add Selected Items'}
          </PrimaryButton>
          <GhostButton
            onClick={onClearSelection}
            disabled={selectedItemIds.length === 0}
            className="!w-full !rounded-full !px-4 !py-3 !text-sm"
          >
            Clear Selection
          </GhostButton>
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Selected Items</div>
          <div className="mt-4 space-y-0">
            {selectedCourseItems.length === 0 && <EmptyState message="No individual items selected yet." />}
            {selectedCourseItems.map((item) => (
              <div key={item.id} className="border-b border-slate-200 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="border-slate-200 bg-slate-50 text-slate-700">
                    {prettyPackItemType(item.item_type)}
                  </Badge>
                  <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                </div>
                <div className="mt-2 text-xs text-slate-500">{selectedCourse?.name ?? item.course_name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
