import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "@/lib/api";
import Pagination from "@/components/ui/Pagination";
import ExamShell from "@/features/exams/components/ExamShell";
import ExamFilters from "@/features/exams/components/ExamFilters";
import ExamListTable from "@/features/exams/components/ExamListTable";
import type { ExamFiltersState, ExamSummary } from "@/features/exams/types";

const normalizeNumber = (value: any) => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

const normalizeExam = (item: any): ExamSummary => {
  const tags = Array.isArray(item?.tags)
    ? item.tags
    : Array.isArray(item?.exam_tags)
      ? item.exam_tags
      : null;

  return {
    id: item?.id ?? item?.exam_id ?? `${Math.random()}`,
    title: item?.title ?? item?.name ?? "Untitled exam",
    description: item?.description ?? null,
    start_datetime: item?.start_datetime ?? item?.startDate ?? item?.start_time ?? null,
    end_datetime: item?.end_datetime ?? item?.endDate ?? item?.end_time ?? null,
    duration_minutes: normalizeNumber(item?.duration_minutes ?? item?.duration ?? item?.durationMinutes),
    status: item?.status ?? item?.state ?? null,
    course_count: normalizeNumber(item?.course_count ?? item?.courses_count ?? item?.courseCount),
    attempts_count: normalizeNumber(item?.attempts_count ?? item?.attempts ?? item?.attemptCount),
    created_by_name: item?.created_by_name ?? item?.createdByName ?? item?.created_by ?? null,
    tags,
  };
};

export default function ExamListPage() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<ExamFiltersState>({
    search: "",
    status: "",
    startFrom: "",
    startTo: "",
  });

  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    let isMounted = true;

    const loadExams = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number> = {
          page,
          page_size: pageSize,
        };
        if (filters.search.trim()) params.q = filters.search.trim();
        if (filters.status) params.status = filters.status;
        if (filters.startFrom) params.start_from = filters.startFrom;
        if (filters.startTo) params.start_to = filters.startTo;

        const res = await api.get("/exams", { params });
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        const totalCount = Number(res.data?.total ?? res.data?.meta?.total ?? payload.length);

        if (!isMounted) return;
        setExams(payload.map(normalizeExam));
        setTotal(Number.isNaN(totalCount) ? payload.length : totalCount);
      } catch (err: any) {
        if (!isMounted) return;
        const message = err?.response?.data?.error || "Failed to load exams.";
        setExams([]);
        setTotal(0);
        setError(message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadExams();

    return () => {
      isMounted = false;
    };
  }, [filters, page]);

  const activeFilterCount = useMemo(
    () =>
      Object.values(filters).filter(
        (value) => typeof value === "string" && value.trim() !== ""
      ).length,
    [filters]
  );

  const handleAction = (action: string, exam: ExamSummary) => {
    if (action === "builder") {
      navigate(`/exams/${exam.id}/builder`);
      return;
    }
    const label = action.charAt(0).toUpperCase() + action.slice(1);
    toast(`${label} for ${exam.title} is coming soon.`);
  };

  const handleClearFilters = () => {
    setFilters({
      search: "",
      status: "",
      startFrom: "",
      startTo: "",
    });
  };

  return (
    <ExamShell
      title="Exam List"
      description="Manage exams, monitor status, and access live controls."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">All Exams</h2>
            <p className="text-sm text-slate-500">{total} exams found</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/exams/new")}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Create Exam
          </button>
        </div>

        <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-slate-800">
            <span>Filters</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {activeFilterCount > 0 ? `${activeFilterCount} active` : "Optional"}
            </span>
          </summary>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <ExamFilters
              filters={filters}
              onChange={setFilters}
              onClear={handleClearFilters}
            />
          </div>
        </details>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Loading exams...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            {error}
          </div>
        ) : exams.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            No exams match the current filters.
          </div>
        ) : (
          <div className="space-y-4">
            <ExamListTable exams={exams} onAction={handleAction} />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </ExamShell>
  );
}
