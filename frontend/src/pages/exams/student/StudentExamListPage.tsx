import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getDashboardTheme } from "@/components/layout/dashboardTheme";
import spectropyLogo from "/logo.png";
import gvjbLogo from "/gvjb.png";
import type { StudentExam, StudentExamStatus } from "@/features/exams/types/studentExam";
import { computeStudentExamStatus } from "@/features/exams/utils/studentExamStatus";
import { startOrResumeExam } from "@/features/exam-runtime/api";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const normalizeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

const normalizeExam = (item: unknown): StudentExam => {
  const source = asRecord(item);
  return {
    id: Number(source.id ?? source.exam_id ?? 0),
    title: String(source.title ?? source.name ?? "Untitled exam"),
    description: source.description ? String(source.description) : null,
    start_datetime:
      typeof source.start_datetime === "string"
        ? source.start_datetime
        : typeof source.startDate === "string"
          ? source.startDate
          : null,
    end_datetime:
      typeof source.end_datetime === "string"
        ? source.end_datetime
        : typeof source.endDate === "string"
          ? source.endDate
          : null,
    total_duration_minutes: normalizeNumber(
      source.total_duration_minutes ?? source.duration_minutes ?? source.duration
    ),
    computed_status: source.computed_status ? String(source.computed_status) : null,
    status: source.status ? String(source.status) : null,
    in_progress_attempt_id: normalizeNumber(source.in_progress_attempt_id),
    has_in_progress_attempt: Boolean(source.has_in_progress_attempt),
  };
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
};

const statusLabelMap: Record<StudentExamStatus, string> = {
  upcoming: "Upcoming",
  ongoing: "Ongoing",
  completed: "Completed",
  max_attempts_reached: "Attempts Exhausted",
  expired: "Expired",
  unknown: "Unknown",
};

const statusClassMap: Record<StudentExamStatus, string> = {
  upcoming: "bg-sky-100 text-sky-700 border-sky-200",
  ongoing: "bg-emerald-100 text-emerald-700 border-emerald-200",
  completed: "bg-indigo-100 text-indigo-700 border-indigo-200",
  max_attempts_reached: "bg-amber-100 text-amber-700 border-amber-200",
  expired: "bg-rose-100 text-rose-700 border-rose-200",
  unknown: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function StudentExamListPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const [exams, setExams] = useState<StudentExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingExamId, setStartingExamId] = useState<number | null>(null);

  const isClientTenant = Boolean(user?.client_id);
  const brandLogo = isClientTenant ? gvjbLogo : spectropyLogo;
  const brandName = isClientTenant ? "GVB" : "Spectropy";
  const dashboardTitle = "Student Dashboard";
  const theme = getDashboardTheme(isClientTenant);

  const userFullName = user?.full_name || "Student";
  const userEmail = user?.email || "student@lms.com";

  const handleBackToLogin = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const fetchExams = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get("/student/exams");
      const payload = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];

      const normalized = payload
        .map(normalizeExam)
        .filter((exam) => Number.isFinite(exam.id) && exam.id > 0);

      setExams(normalized);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setError("Student exams endpoint was not found (404). Please contact your administrator.");
      } else if (axios.isAxiosError(err)) {
        const message =
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to load exams.";
        setError(String(message));
      } else {
        setError("Failed to load exams.");
      }
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchExams();
  }, [fetchExams]);

  const examsWithStatus = useMemo(
    () => exams.map((exam) => ({ exam, status: computeStudentExamStatus(exam) })),
    [exams]
  );

  const handleStartOrResume = async (exam: StudentExam) => {
    setStartingExamId(exam.id);
    try {
      const runtimeState = await startOrResumeExam(exam.id);
      const attemptId = runtimeState?.attempt?.id;
      if (!attemptId) {
        toast.error("Could not open exam attempt. Please try again.");
        return;
      }
      navigate(`/student/exams/attempt/${attemptId}`);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message =
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Unable to start exam.";
        toast.error(String(message));
      } else {
        toast.error("Unable to start exam.");
      }
    } finally {
      setStartingExamId(null);
    }
  };

  return (
    <div className={theme.shellClass}>
      <div className={theme.layoutClass}>
        <aside
          className={`flex w-full flex-col border-b lg:w-72 lg:border-b-0 lg:border-r ${
            isClientTenant ? "border-amber-100 bg-white/90 backdrop-blur" : "border-blue-100 bg-white"
          }`}
        >
          <div className={`p-6 border-b ${isClientTenant ? "border-amber-100" : "border-blue-100"}`}>
            <div className="flex items-center space-x-3">
              <img
                src={brandLogo}
                alt={`${brandName} Logo`}
                className="h-11 w-auto rounded-md object-contain"
              />
              <div>
                <p
                  className={`text-xs uppercase tracking-[0.3em] ${
                    isClientTenant ? "text-amber-700" : "text-blue-600"
                  }`}
                >
                  {brandName}
                </p>
                <h1 className="text-lg font-semibold">{dashboardTitle}</h1>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <button
              onClick={() => navigate("/student/dashboard")}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-2xl transition-colors ${
                isClientTenant
                  ? "text-slate-700 hover:bg-amber-50"
                  : "text-slate-700 hover:bg-gray-100"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              Courses
            </button>

            <button
              onClick={() => navigate("/student/exams")}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-2xl transition-colors ${
                isClientTenant
                  ? "bg-amber-100 text-amber-900 border-l-4 border-amber-600"
                  : "bg-blue-100 text-blue-900 border-l-4 border-blue-700"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Exams
            </button>
          </nav>

          <div className="px-4 pb-4">
            <div
              className={`flex items-center rounded-2xl border p-3 ${
                isClientTenant ? "border-amber-100 bg-amber-50" : "border-blue-100 bg-blue-50"
              }`}
            >
              <div
                className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  isClientTenant ? "bg-amber-200" : "bg-blue-200"
                }`}
              >
                <span className={`font-semibold text-xl ${isClientTenant ? "text-amber-900" : "text-blue-900"}`}>
                  {userFullName?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-semibold text-slate-900 truncate">{userFullName}</p>
                <p className="text-xs text-slate-500 truncate">{userEmail}</p>
              </div>
            </div>
          </div>

          <footer className={`mt-auto border-t px-4 py-2 ${isClientTenant ? "border-amber-100" : "border-blue-100"}`}>
            <button
              onClick={handleBackToLogin}
              className={`w-full flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold ${
                isClientTenant
                  ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                  : "border-blue-200 text-blue-700 hover:bg-blue-50"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Logout
            </button>
          </footer>
        </aside>

        <section className="flex-1 overflow-y-auto">
          <div
            className={`border-b px-6 py-6 backdrop-blur ${
              isClientTenant ? "border-amber-100 bg-white/70" : "border-blue-100 bg-white"
            }`}
          >
            <h1 className="text-2xl font-bold">My Exams</h1>
            <p className="text-slate-600 mt-1">Check exam schedule and enter the exam runtime screen.</p>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600">
                Loading exams...
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
                <p className="text-sm font-medium text-rose-700">{error}</p>
                <button
                  type="button"
                  onClick={fetchExams}
                  className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  Retry
                </button>
              </div>
            ) : examsWithStatus.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                <h2 className="text-lg font-semibold text-slate-900">No exams available</h2>
                <p className="mt-2 text-sm text-slate-600">
                  No exams are assigned to your courses yet. Please check back later.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {examsWithStatus.map(({ exam, status }) => {
                  const canResume = Boolean(exam.in_progress_attempt_id || exam.has_in_progress_attempt);
                  const canStart = canResume || status === "ongoing";
                  const ctaLabel = exam.in_progress_attempt_id || exam.has_in_progress_attempt ? "Resume Exam" : "Start Exam";
                  const isStarting = startingExamId === exam.id;

                  return (
                    <article
                      key={exam.id}
                      className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-base font-semibold text-slate-900">{exam.title}</h2>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusClassMap[status]}`}
                        >
                          {statusLabelMap[status]}
                        </span>
                      </div>

                      {exam.description && (
                        <p className="mt-3 line-clamp-3 text-sm text-slate-600">{exam.description}</p>
                      )}

                      <dl className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between gap-3">
                          <dt className="text-slate-500">Start</dt>
                          <dd className="text-right font-medium text-slate-800">{formatDateTime(exam.start_datetime)}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-slate-500">End</dt>
                          <dd className="text-right font-medium text-slate-800">{formatDateTime(exam.end_datetime)}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-slate-500">Duration</dt>
                          <dd className="font-medium text-slate-800">
                            {exam.total_duration_minutes !== null ? `${exam.total_duration_minutes} mins` : "--"}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-5">
                        {status === "completed" ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/student/exams/${exam.id}/result`)}
                            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                          >
                            View Result
                          </button>
                        ) : canStart ? (
                          <button
                            type="button"
                            onClick={() => {
                              void handleStartOrResume(exam);
                            }}
                            disabled={isStarting}
                            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isStarting ? "Opening..." : ctaLabel}
                          </button>
                        ) : status === "max_attempts_reached" ? (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                            Maximum attempts reached.
                          </div>
                        ) : status === "expired" ? (
                          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                            Exam window has closed.
                          </div>
                        ) : (
                          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                            Exam not started yet.
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

