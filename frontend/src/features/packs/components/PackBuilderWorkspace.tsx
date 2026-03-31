import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import Pagination from '@/components/ui/Pagination';
import { Badge, GhostButton, PrimaryButton } from '@/pages/dashboard/superadmin/components/ui';
import type {
  AddPackItemsResponse,
  CourseContentPreviewItem,
  CourseSearchResult,
  CreateCourseResponse,
  CreatePackResponse,
  PackCompositionSummary,
  PackItemPreview,
  PackSummary,
  PaginatedResponse,
  RemovePackItemResponse,
} from '../types';

const PACK_PAGE_SIZE = 8;
const COURSE_PAGE_SIZE = 8;

const prettyType = (value: string) => (value === 'exam' ? 'Quiz' : value === 'pdf' ? 'PDF' : value === 'video' ? 'Video' : value);
const packLabel = (pack: PackSummary) => `${pack.name} | ${pack.item_count} items`;
const readError = (error: unknown, fallback: string) =>
  typeof error === 'object' && error !== null && (error as { response?: { data?: { error?: string } } }).response?.data?.error
    ? String((error as { response?: { data?: { error?: string } } }).response?.data?.error)
    : fallback;

type PendingRemoval = {
  packId: number;
  timerId: number;
  toastId: string;
  packItems: PaginatedResponse<PackItemPreview> | null;
  packSummary: PackCompositionSummary | null;
  packs: PackSummary[];
};

export default function PackBuilderWorkspace() {
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [packsLoading, setPacksLoading] = useState(true);
  const [packsError, setPacksError] = useState<string | null>(null);
  const [selectedPackId, setSelectedPackId] = useState<number | null>(null);

  const [packItems, setPackItems] = useState<PaginatedResponse<PackItemPreview> | null>(null);
  const [packItemsLoading, setPackItemsLoading] = useState(false);
  const [packItemsError, setPackItemsError] = useState<string | null>(null);
  const [packItemsPage, setPackItemsPage] = useState(1);

  const [packSummary, setPackSummary] = useState<PackCompositionSummary | null>(null);
  const [packSummaryLoading, setPackSummaryLoading] = useState(false);
  const [packSummaryError, setPackSummaryError] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);

  const [courseQuery, setCourseQuery] = useState('');
  const deferredQuery = useDeferredValue(courseQuery.trim());
  const [courseResults, setCourseResults] = useState<CourseSearchResult[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [courseReloadKey, setCourseReloadKey] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState<CourseSearchResult | null>(null);

  const [courseContent, setCourseContent] = useState<PaginatedResponse<CourseContentPreviewItem> | null>(null);
  const [courseContentLoading, setCourseContentLoading] = useState(false);
  const [courseContentError, setCourseContentError] = useState<string | null>(null);
  const [courseContentPage, setCourseContentPage] = useState(1);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);

  const [addSubmitting, setAddSubmitting] = useState(false);
  const [attachSubmitting, setAttachSubmitting] = useState(false);
  const [pendingRemoveIds, setPendingRemoveIds] = useState<number[]>([]);

  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [courseModalSubmitting, setCourseModalSubmitting] = useState(false);
  const [courseForm, setCourseForm] = useState({ name: '', grade: '', subject: '' });
  const [courseFormErrors, setCourseFormErrors] = useState<{ name?: string; grade?: string }>({});
  const [packModalOpen, setPackModalOpen] = useState(false);
  const [packModalSubmitting, setPackModalSubmitting] = useState(false);
  const [packForm, setPackForm] = useState({ name: '', description: '' });
  const [packFormErrors, setPackFormErrors] = useState<{ name?: string }>({});

  const pendingRemovalRef = useRef<Map<number, PendingRemoval>>(new Map());

  const selectedPack = useMemo(() => packs.find((pack) => pack.id === selectedPackId) ?? null, [packs, selectedPackId]);
  const selectedCourseItems = useMemo(
    () => (courseContent?.data ?? []).filter((item) => selectedItemIds.includes(item.id)),
    [courseContent, selectedItemIds]
  );

  const syncPackMetrics = (itemCount: number, groups?: PackCompositionSummary['groups']) => {
    if (!selectedPackId) return;
    setPacks((current) =>
      current.map((pack) =>
        pack.id === selectedPackId
          ? { ...pack, item_count: itemCount, course_count: groups ? new Set(groups.map((group) => group.course_id)).size : pack.course_count }
          : pack
      )
    );
  };

  const refreshPacks = async (silent = false) => {
    try {
      if (!silent) setPacksLoading(true);
      setPacksError(null);
      const response = await api.get<PaginatedResponse<PackSummary>>('/packs', { params: { page: 1, page_size: 100 } });
      setPacks(response.data.data);
      setSelectedPackId((current) => (current && response.data.data.some((pack) => pack.id === current) ? current : response.data.data[0]?.id ?? null));
    } catch (error) {
      setPacksError(readError(error, 'Failed to load packs.'));
    } finally {
      if (!silent) setPacksLoading(false);
    }
  };

  const refreshPackData = async (packId: number, page = packItemsPage, silent = false) => {
    try {
      if (!silent) {
        setPackItemsLoading(true);
        setPackSummaryLoading(true);
      }
      setPackItemsError(null);
      setPackSummaryError(null);
      const [itemsResponse, summaryResponse] = await Promise.all([
        api.get<PaginatedResponse<PackItemPreview>>(`/packs/${packId}/items`, { params: { page, page_size: PACK_PAGE_SIZE } }),
        api.get<PackCompositionSummary>(`/packs/${packId}/summary`),
      ]);
      setPackItems(itemsResponse.data);
      setPackSummary(summaryResponse.data);
      syncPackMetrics(summaryResponse.data.total_items, summaryResponse.data.groups);
    } catch (error) {
      const message = readError(error, 'Failed to load pack data.');
      setPackItemsError(message);
      setPackSummaryError(message);
    } finally {
      if (!silent) {
        setPackItemsLoading(false);
        setPackSummaryLoading(false);
      }
    }
  };

  useEffect(() => {
    void refreshPacks();
    return () => {
      pendingRemovalRef.current.forEach((entry) => window.clearTimeout(entry.timerId));
      pendingRemovalRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!selectedPackId) {
      setPackItems(null);
      setPackSummary(null);
      return;
    }
    void refreshPackData(selectedPackId, packItemsPage);
  }, [selectedPackId, packItemsPage]);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        setCoursesLoading(true);
        setCoursesError(null);
        const response = await api.get<PaginatedResponse<CourseSearchResult>>('/courses', {
          params: { page: 1, page_size: COURSE_PAGE_SIZE, q: deferredQuery || undefined },
        });
        setCourseResults(response.data.data);
      } catch (error) {
        setCoursesError(readError(error, 'Failed to search courses.'));
      } finally {
        setCoursesLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [deferredQuery, courseReloadKey]);

  useEffect(() => {
    setSelectedItemIds([]);
  }, [selectedCourse?.id, courseContentPage]);

  useEffect(() => {
    if (!selectedCourse) {
      setCourseContent(null);
      setCourseContentError(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        setCourseContentLoading(true);
        setCourseContentError(null);
        const response = await api.get<PaginatedResponse<CourseContentPreviewItem>>(`/courses/${selectedCourse.id}/content`, {
          params: { page: courseContentPage, page_size: COURSE_PAGE_SIZE },
        });
        if (!cancelled) setCourseContent(response.data);
      } catch (error) {
        if (!cancelled) setCourseContentError(readError(error, 'Failed to load course content.'));
      } finally {
        if (!cancelled) setCourseContentLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedCourse, courseContentPage]);

  const createCourse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = {
      name: courseForm.name.trim() ? undefined : 'Name is required.',
      grade: courseForm.grade.trim() ? undefined : 'Grade is required.',
    };
    setCourseFormErrors(nextErrors);
    if (nextErrors.name || nextErrors.grade) return;

    try {
      setCourseModalSubmitting(true);
      const response = await api.post<CreateCourseResponse>('/courses', {
        name: courseForm.name.trim(),
        grade: courseForm.grade.trim(),
        subject: courseForm.subject.trim() || undefined,
      });
      const createdCourse: CourseSearchResult = {
        id: response.data.course_id,
        name: courseForm.name.trim(),
        grade: courseForm.grade.trim(),
        subject: courseForm.subject.trim() || null,
        client_id: null,
        content_item_count: 0,
        created_at: new Date().toISOString(),
      };
      setSelectedCourse(createdCourse);
      setCourseContent({ data: [], page: 1, page_size: COURSE_PAGE_SIZE, total: 0 });
      setCourseContentPage(1);
      setCourseQuery(createdCourse.name);
      setCourseReloadKey((current) => current + 1);
      setCourseResults((current) => [createdCourse, ...current.filter((course) => course.id !== createdCourse.id)]);
      setCourseForm({ name: '', grade: '', subject: '' });
      setCourseFormErrors({});
      setCourseModalOpen(false);
      toast.success('Course created.');
    } catch (error) {
      toast.error(readError(error, 'Failed to create course.'));
    } finally {
      setCourseModalSubmitting(false);
    }
  };

  const createPack = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = {
      name: packForm.name.trim() ? undefined : 'Name is required.',
    };
    setPackFormErrors(nextErrors);
    if (nextErrors.name) return;

    try {
      setPackModalSubmitting(true);
      const response = await api.post<CreatePackResponse>('/packs', {
        name: packForm.name.trim(),
        description: packForm.description.trim() || undefined,
      });

      setPacks((current) => [response.data, ...current.filter((pack) => pack.id !== response.data.id)]);
      setSelectedPackId(response.data.id);
      setPackItemsPage(1);
      setPackForm({ name: '', description: '' });
      setPackFormErrors({});
      setPackModalOpen(false);
      toast.success('Pack created.');
    } catch (error) {
      const message = readError(error, 'Failed to create pack.');
      setPackFormErrors((current) => ({ ...current, name: message.includes('already exists') ? message : current.name }));
      toast.error(message);
    } finally {
      setPackModalSubmitting(false);
    }
  };

  const addSelectedItems = async () => {
    if (!selectedPackId || selectedCourseItems.length === 0) return;
    const optimisticItems = selectedCourseItems.map((item) => buildPackItemPreview(item));
    const snapshot = { packItems, packSummary, packs };
    setAddSubmitting(true);
    setPackItems((current) => current ? { ...current, total: current.total + optimisticItems.length, data: current.page === 1 ? [...optimisticItems, ...current.data].slice(0, current.page_size) : current.data } : current);
    setSelectedItemIds([]);
    try {
      const response = await api.post<AddPackItemsResponse>(`/packs/${selectedPackId}/items`, { item_ids: optimisticItems.map((item) => item.id) });
      const addedCount = response.data.added_item_ids.length;
      toast.success(addedCount > 0 ? `Added ${addedCount} item${addedCount > 1 ? 's' : ''} to the pack.` : 'Those items are already in the pack.');
    } catch (error) {
      setPackItems(snapshot.packItems);
      setPackSummary(snapshot.packSummary);
      setPacks(snapshot.packs);
      toast.error(readError(error, 'Failed to add items to the pack.'));
    } finally {
      setAddSubmitting(false);
      await refreshPacks(true);
      await refreshPackData(selectedPackId, packItemsPage, true);
    }
  };

  const attachCourse = async () => {
    if (!selectedPackId || !selectedCourse) return;
    try {
      setAttachSubmitting(true);
      const response = await api.post<AddPackItemsResponse>(`/packs/${selectedPackId}/attach-course`, { course_id: selectedCourse.id });
      toast.success(response.data.added_item_ids.length > 0 ? `Attached ${response.data.added_item_ids.length} items from ${selectedCourse.name}.` : 'This course had no new items to attach.');
      await refreshPacks(true);
      await refreshPackData(selectedPackId, packItemsPage, true);
    } catch (error) {
      toast.error(readError(error, 'Failed to attach course.'));
    } finally {
      setAttachSubmitting(false);
    }
  };

  const undoRemove = async (itemId: number) => {
    const pending = pendingRemovalRef.current.get(itemId);
    if (!pending) return;
    window.clearTimeout(pending.timerId);
    toast.dismiss(pending.toastId);
    pendingRemovalRef.current.delete(itemId);
    setPendingRemoveIds((current) => current.filter((id) => id !== itemId));
    if (pending.packId === selectedPackId) {
      setPackItems(pending.packItems);
      setPackSummary(pending.packSummary);
      setPacks(pending.packs);
    }
    toast('Removal cancelled.');
  };

  const removeItem = (item: PackItemPreview) => {
    if (!selectedPackId || pendingRemovalRef.current.has(item.id)) return;
    const snapshot = { packItems, packSummary, packs };
    setPackItems((current) => current ? { ...current, total: Math.max(current.total - 1, 0), data: current.data.filter((entry) => entry.id !== item.id) } : current);
    setPendingRemoveIds((current) => [...current, item.id]);
    const timerId = window.setTimeout(async () => {
      try {
        await api.delete<RemovePackItemResponse>(`/packs/${selectedPackId}/items/${item.id}`);
        toast.success(`Removed ${item.title} from the pack.`);
      } catch (error) {
        setPackItems(snapshot.packItems);
        setPackSummary(snapshot.packSummary);
        setPacks(snapshot.packs);
        toast.error(readError(error, 'Failed to remove item.'));
      } finally {
        const pending = pendingRemovalRef.current.get(item.id);
        if (pending) {
          toast.dismiss(pending.toastId);
          pendingRemovalRef.current.delete(item.id);
        }
        setPendingRemoveIds((current) => current.filter((id) => id !== item.id));
        await refreshPacks(true);
        await refreshPackData(selectedPackId, packItemsPage, true);
      }
    }, 3000);
    const toastId = toast.custom(() => (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
        <span className="text-sm text-slate-700">Removed {item.title}</span>
        <button type="button" onClick={() => void undoRemove(item.id)} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
          Undo
        </button>
      </div>
    ), { duration: 3200 });
    pendingRemovalRef.current.set(item.id, { packId: selectedPackId, timerId, toastId, packItems: snapshot.packItems, packSummary: snapshot.packSummary, packs: snapshot.packs });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Pack Builder</div>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">Item-based platform packs</h2>
        <p className="mt-2 text-sm text-slate-600">Create platform courses, select individual items, attach whole courses, and review pack composition in one workspace.</p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Pack</h3>
          <p className="mt-1 text-sm text-slate-500">Choose the pack you want to build.</p>
          <select value={selectedPackId ?? ''} onChange={(event) => { setSelectedPackId(event.target.value ? Number(event.target.value) : null); setPackItemsPage(1); }} disabled={packsLoading || !!packsError || packs.length === 0} className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
            <option value="">{packsLoading ? 'Loading packs...' : packsError ? 'Failed to load packs' : packs.length === 0 ? 'No packs available' : 'Choose a pack'}</option>
            {packs.map((pack) => <option key={pack.id} value={pack.id}>{packLabel(pack)}</option>)}
          </select>
          {packsError && <p className="mt-3 text-sm text-rose-600">{packsError}</p>}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><div className="text-xs uppercase tracking-[0.2em] text-slate-500">Selected</div><div className="mt-2 text-lg font-semibold text-slate-900">{selectedPack?.name ?? 'No pack selected'}</div></div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"><div className="text-xs uppercase tracking-[0.2em] text-slate-500">Items</div><div className="mt-2 text-2xl font-semibold text-slate-900">{selectedPack?.item_count ?? 0}</div></div>
          </div>
          <div className="mt-5 flex gap-3">
            <GhostButton onClick={() => setPackModalOpen(true)} className="!rounded-xl !px-4 !py-2 !text-sm">Create Pack</GhostButton>
            <GhostButton onClick={() => setCourseModalOpen(true)} className="!rounded-xl !px-4 !py-2 !text-sm">Create Course</GhostButton>
            <GhostButton onClick={() => { if (selectedPackId) void refreshPackData(selectedPackId, packItemsPage); }} disabled={!selectedPackId} className="!rounded-xl !px-4 !py-2 !text-sm">Refresh</GhostButton>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div><h3 className="text-lg font-semibold text-slate-900">Course Browser</h3><p className="mt-1 text-sm text-slate-500">Search by name, grade, or subject.</p></div>
            {selectedItemIds.length > 0 && <Badge tone="border-emerald-200 bg-emerald-50 text-emerald-700">{selectedItemIds.length} selected</Badge>}
          </div>
          <input value={courseQuery} onChange={(event) => startTransition(() => setCourseQuery(event.target.value))} placeholder="Search courses" className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700" />
          <div className="mt-4 space-y-3">
            {coursesLoading && <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Loading courses...</div>}
            {!coursesLoading && coursesError && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">{coursesError}</div>}
            {!coursesLoading && !coursesError && courseResults.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No global courses matched your search.</div>}
            {!coursesLoading && !coursesError && courseResults.map((course) => (
              <button key={course.id} type="button" onClick={() => { setSelectedCourse(course); setCourseContentPage(1); }} className={`w-full rounded-2xl border p-4 text-left ${selectedCourse?.id === course.id ? 'border-sky-300 bg-sky-50' : 'border-slate-100 bg-slate-50/70'}`}>
                <div className="font-semibold text-slate-900">{course.name}</div>
                <div className="mt-1 text-xs text-slate-500">{[course.grade, course.subject].filter(Boolean).join(' | ') || 'No grade/subject'} | {course.content_item_count} items</div>
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><div className="text-xs uppercase tracking-[0.2em] text-slate-500">Content Items</div><div className="mt-2 text-base font-semibold text-slate-900">{selectedCourse?.name ?? 'Select a course'}</div></div>
              <div className="flex gap-2">
                <GhostButton onClick={() => void attachCourse()} disabled={!selectedCourse || !selectedPackId || attachSubmitting} className="!rounded-xl !px-4 !py-2 !text-sm">{attachSubmitting ? 'Attaching...' : 'Attach Entire Course'}</GhostButton>
                <button type="button" onClick={() => void addSelectedItems()} disabled={!selectedPackId || selectedItemIds.length === 0 || addSubmitting} className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${!selectedPackId || selectedItemIds.length === 0 || addSubmitting ? 'bg-slate-300' : 'bg-[#073b8a] hover:bg-[#16263b]'}`}>{addSubmitting ? 'Adding...' : 'Add to Pack'}</button>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {!selectedCourse && <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Pick a course to browse its content items.</div>}
              {selectedCourse && courseContentLoading && <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Loading course content...</div>}
              {selectedCourse && courseContentError && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">{courseContentError}</div>}
              {selectedCourse && !courseContentLoading && !courseContentError && courseContent?.data.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">This course does not contain any items yet.</div>}
              {selectedCourse && !courseContentLoading && !courseContentError && courseContent?.data.map((item) => (
                <label key={item.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4">
                  <input type="checkbox" checked={selectedItemIds.includes(item.id)} onChange={() => setSelectedItemIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} className="mt-1 h-4 w-4 rounded border-slate-300 text-[#073b8a]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><Badge tone="border-slate-200 bg-slate-50 text-slate-700">{prettyType(item.item_type)}</Badge><span className="truncate text-sm font-semibold text-slate-900">{item.title}</span></div>
                    <div className="mt-2 text-xs text-slate-500">{[item.course_name, item.grade, item.subject].filter(Boolean).join(' | ')}</div>
                  </div>
                </label>
              ))}
              {selectedCourse && courseContent && <Pagination page={courseContent.page} pageSize={courseContent.page_size} total={courseContent.total} onPageChange={setCourseContentPage} />}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-900">Current Pack</h3><p className="mt-1 text-sm text-slate-500">Review and remove attached items.</p></div>{selectedPack && <Badge tone="border-slate-200 bg-slate-50 text-slate-700">{selectedPack.item_count} attached</Badge>}</div>
            <div className="mt-4 space-y-3">
              {!selectedPack && <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Choose a pack to inspect its items.</div>}
              {selectedPack && packItemsLoading && <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Loading pack items...</div>}
              {selectedPack && packItemsError && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">{packItemsError}</div>}
              {selectedPack && !packItemsLoading && !packItemsError && packItems?.data.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">This pack does not contain any items yet.</div>}
              {selectedPack && !packItemsLoading && !packItemsError && packItems?.data.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge tone="border-slate-200 bg-white text-slate-700">{prettyType(item.item_type)}</Badge><span className="truncate text-sm font-semibold text-slate-900">{item.title}</span></div><div className="mt-2 text-xs text-slate-500">{[item.course_name, item.grade, item.subject].filter(Boolean).join(' | ')}</div></div>
                  <GhostButton onClick={() => removeItem(item)} disabled={pendingRemoveIds.includes(item.id)} className="!rounded-xl !px-3 !py-2">{pendingRemoveIds.includes(item.id) ? 'Undo window...' : 'Remove'}</GhostButton>
                </div>
              ))}
              {selectedPack && packItems && <Pagination page={packItems.page} pageSize={packItems.page_size} total={packItems.total} onPageChange={setPackItemsPage} />}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-slate-900">Summary</h3><p className="mt-1 text-sm text-slate-500">Grouped by course and subject.</p></div>{packSummary && <Badge tone="border-emerald-200 bg-emerald-50 text-emerald-700">{packSummary.total_items} total</Badge>}</div>
            <div className="mt-4 space-y-3">
              {!selectedPack && <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Select a pack to view grouped composition.</div>}
              {selectedPack && packSummaryLoading && <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">Loading summary...</div>}
              {selectedPack && packSummaryError && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">{packSummaryError}</div>}
              {selectedPack && !packSummaryLoading && !packSummaryError && packSummary?.groups.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No grouped content to summarize yet.</div>}
              {selectedPack && !packSummaryLoading && !packSummaryError && packSummary?.groups.map((group) => {
                const groupKey = `${group.course_id}:${group.subject ?? ''}`;
                const collapsed = collapsedGroups.includes(groupKey);
                return (
                  <div key={groupKey} className="rounded-2xl border border-slate-100 bg-slate-50/70">
                    <button type="button" onClick={() => setCollapsedGroups((current) => current.includes(groupKey) ? current.filter((value) => value !== groupKey) : [...current, groupKey])} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                      <div><div className="text-sm font-semibold text-slate-900">{group.course_name}</div><div className="mt-1 text-xs text-slate-500">{[group.grade, group.subject].filter(Boolean).join(' | ') || 'No grade/subject'}</div></div>
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{group.item_count} items {collapsed ? '+' : '-'}</span>
                    </button>
                    {!collapsed && <div className="space-y-2 border-t border-slate-100 px-4 py-3">{group.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-700">{item.title}</span><Badge tone="border-slate-200 bg-white text-slate-700">{prettyType(item.item_type)}</Badge></div>)}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {packModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Create Pack</div><h3 className="mt-2 text-xl font-semibold text-slate-900">Create a new content pack</h3></div>
              <button type="button" onClick={() => setPackModalOpen(false)} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">Close</button>
            </div>
            <form onSubmit={createPack} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Name</label>
                <input
                  value={packForm.name}
                  onChange={(event) => setPackForm((current) => ({ ...current, name: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                  placeholder="Pack name"
                />
                {packFormErrors.name && <p className="mt-2 text-sm text-rose-600">{packFormErrors.name}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Description</label>
                <textarea
                  value={packForm.description}
                  onChange={(event) => setPackForm((current) => ({ ...current, description: event.target.value }))}
                  className="mt-2 min-h-[120px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                  placeholder="Short description for this pack"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setPackModalOpen(false)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Cancel</button>
                <PrimaryButton type="submit" disabled={packModalSubmitting}>{packModalSubmitting ? 'Creating...' : 'Create Pack'}</PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {courseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Create Course</div><h3 className="mt-2 text-xl font-semibold text-slate-900">Add a new platform course</h3></div>
              <button type="button" onClick={() => setCourseModalOpen(false)} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">Close</button>
            </div>
            <form onSubmit={createCourse} className="mt-6 space-y-4">
              <div><label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Name</label><input value={courseForm.name} onChange={(event) => setCourseForm((current) => ({ ...current, name: event.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700" placeholder="Course name" />{courseFormErrors.name && <p className="mt-2 text-sm text-rose-600">{courseFormErrors.name}</p>}</div>
              <div><label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Grade</label><input value={courseForm.grade} onChange={(event) => setCourseForm((current) => ({ ...current, grade: event.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700" placeholder="Grade" />{courseFormErrors.grade && <p className="mt-2 text-sm text-rose-600">{courseFormErrors.grade}</p>}</div>
              <div><label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Subject</label><input value={courseForm.subject} onChange={(event) => setCourseForm((current) => ({ ...current, subject: event.target.value }))} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700" placeholder="Subject" /></div>
              <div className="flex gap-3 pt-2"><button type="button" onClick={() => setCourseModalOpen(false)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Cancel</button><PrimaryButton type="submit" disabled={courseModalSubmitting}>{courseModalSubmitting ? 'Creating...' : 'Create Course'}</PrimaryButton></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
