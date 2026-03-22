import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "@/lib/api";
import Pagination from "@/components/ui/Pagination";
import ExamShell from "@/features/exams/components/ExamShell";
import ExamFilters from "@/features/exams/components/ExamFilters";
import ExamListTable from "@/features/exams/components/ExamListTable";
import type { ExamFiltersState, ExamSummary } from "@/features/exams/types";

interface CourseOption {
  id: number;
  title: string;
  description?: string | null;
  published?: boolean | null;
}

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

const normalizeCourse = (item: any): CourseOption | null => {
  const id = Number(item?.id);
  if (!Number.isInteger(id) || id <= 0) return null;

  return {
    id,
    title: String(item?.title ?? "Untitled course"),
    description: item?.description ?? null,
    published: item?.published ?? null,
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

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<ExamSummary | null>(null);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const loadExams = useCallback(async () => {
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

      setExams(payload.map(normalizeExam));
      setTotal(Number.isNaN(totalCount) ? payload.length : totalCount);
    } catch (err: any) {
      const message = err?.response?.data?.error || "Failed to load exams.";
      setExams([]);
      setTotal(0);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!isMounted) return;
      await loadExams();
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [loadExams]);

  const activeFilterCount = useMemo(
    () =>
      Object.values(filters).filter(
        (value) => typeof value === "string" && value.trim() !== ""
      ).length,
    [filters]
  );

  const loadAssignmentData = useCallback(async (exam: ExamSummary) => {
    setAssignLoading(true);
    setAssignError(null);
    try {
      const [coursesRes, assignedRes] = await Promise.all([
        api.get("/course/courses"),
        api.get(`/exams/${exam.id}/courses`),
      ]);

      const allCoursesPayload = Array.isArray(coursesRes.data) ? coursesRes.data : [];
      const normalizedCourses = allCoursesPayload
        .map(normalizeCourse)
        .filter((course): course is CourseOption => Boolean(course));

      const assignedPayload = Array.isArray(assignedRes.data?.courses)
        ? assignedRes.data.courses
        : Array.isArray(assignedRes.data)
          ? assignedRes.data
          : [];

      const assignedIds = assignedPayload
        .map((item: any) => Number(item?.id ?? item?.course_id))
        .filter((id: number) => Number.isInteger(id) && id > 0);

      setCourses(normalizedCourses);
      setSelectedCourseIds([...new Set(assignedIds)]);
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to load assignment data.";
      setAssignError(message);
      setCourses([]);
      setSelectedCourseIds([]);
    } finally {
      setAssignLoading(false);
    }
  }, []);

  const openAssignModal = useCallback(async (exam: ExamSummary) => {
    setSelectedExam(exam);
    setAssignOpen(true);
    await loadAssignmentData(exam);
  }, [loadAssignmentData]);

  const closeAssignModal = () => {
    if (assignSaving) return;
    setAssignOpen(false);
    setAssignError(null);
    setSelectedExam(null);
    setCourses([]);
    setSelectedCourseIds([]);
  };

  const toggleCourseSelection = (courseId: number) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  const saveAssignments = async () => {
    if (!selectedExam) return;
    setAssignSaving(true);
    setAssignError(null);
    try {
      await api.put(`/exams/${selectedExam.id}/courses`, {
        course_ids: selectedCourseIds,
      });
      toast.success("Exam course assignment updated.");
      await loadExams();
      closeAssignModal();
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to save assignments.";
      setAssignError(message);
    } finally {
      setAssignSaving(false);
    }
  };

  const handleAction = (action: string, exam: ExamSummary) => {
    if (action === "builder") {
      navigate(`/exams/${exam.id}/builder`);
      return;
    }

    if (action === "assign") {
      openAssignModal(exam);
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
    <>
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

      {assignOpen && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Assign Courses</h3>
                <p className="mt-1 text-sm text-slate-600">{selectedExam.title}</p>
              </div>
              <button
                type="button"
                onClick={closeAssignModal}
                className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
                disabled={assignSaving}
              >
                Close
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
              {assignLoading ? (
                <p className="text-sm text-slate-600">Loading course assignments...</p>
              ) : assignError ? (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  {assignError}
                </div>
              ) : courses.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  No courses found to assign.
                </div>
              ) : (
                <div className="space-y-2">
                  {courses.map((course) => {
                    const checked = selectedCourseIds.includes(course.id);
                    return (
                      <label
                        key={course.id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                          checked={checked}
                          onChange={() => toggleCourseSelection(course.id)}
                          disabled={assignSaving}
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{course.title}</p>
                          {course.description && (
                            <p className="mt-1 text-xs text-slate-600 line-clamp-2">{course.description}</p>
                          )}
                          {course.published === false && (
                            <p className="mt-1 text-[11px] font-medium text-amber-700">Unpublished course</p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
              <p className="text-xs text-slate-500">
                {selectedCourseIds.length} course{selectedCourseIds.length === 1 ? "" : "s"} selected
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeAssignModal}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  disabled={assignSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveAssignments}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={assignSaving || assignLoading}
                >
                  {assignSaving ? "Saving..." : "Save Assignment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
