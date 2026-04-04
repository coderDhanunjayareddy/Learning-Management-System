import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getAttemptResult, getStudentExams } from "@/features/exam-runtime/api";
import type { AttemptResultResponse } from "@/features/exam-runtime/types";
import ResultSummaryCard from "@/features/exam-runtime/components/result/ResultSummaryCard";
import ResultStatsGrid from "@/features/exam-runtime/components/result/ResultStatsGrid";
import SectionBreakdownCard from "@/features/exam-runtime/components/result/SectionBreakdownCard";
import QuestionReviewList from "@/features/exam-runtime/components/result/QuestionReviewList";
import {
  deriveSectionBreakdown,
  getTimeSpentSeconds,
  groupQuestionsBySection,
} from "@/features/exam-runtime/components/result/resultUtils";
import {
  buildExamContentRoutePath,
  getExamContentRouteContextFromSearch,
  getExamContentRouteContextFromState,
  mergeExamContentRouteContexts,
  type ExamContentRouteContext,
} from "@/features/exam-runtime/navigation";

export default function StudentExamResultPlaceholderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { examId } = useParams<{ examId: string }>();

  const initialRouteContext = useMemo(
    () =>
      mergeExamContentRouteContexts(
        getExamContentRouteContextFromState(location.state),
        getExamContentRouteContextFromSearch(location.search)
      ),
    [location.search, location.state]
  );

  const examIdNumber = Number(examId);
  const validExamId = Number.isInteger(examIdNumber) && examIdNumber > 0;

  const [resolvedAttemptId, setResolvedAttemptId] = useState<number | null>(null);
  const [resolvingAttempt, setResolvingAttempt] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<AttemptResultResponse | null>(null);
  const [resolvedExamRouteContext, setResolvedExamRouteContext] = useState<ExamContentRouteContext>(initialRouteContext);
  useEffect(() => {
    setResolvedExamRouteContext(initialRouteContext);
  }, [examIdNumber, initialRouteContext]);

  const handleUnauthorized = useCallback(() => {
    navigate("/login", { replace: true });
  }, [navigate]);

  const resolveMostRecentAttempt = useCallback(async () => {
    if (!validExamId) {
      setResolvedAttemptId(null);
      setResolvingAttempt(false);
      setError("Invalid exam id.");
      return;
    }

    setResolvingAttempt(true);
    setError(null);

    try {
      const exams = await getStudentExams();
      const currentExam = exams.find((item) => item.id === examIdNumber);
      if (!currentExam) {
        setResolvedAttemptId(null);
        setError("Exam not found.");
        return;
      }

      setResolvedExamRouteContext((prev) =>
        mergeExamContentRouteContexts(prev, {
          courseId: currentExam.course_id ?? null,
          contentId: currentExam.content_id ?? null,
        })
      );

      const latestAttemptId = currentExam.latest_completed_attempt_id ?? null;
      if (!latestAttemptId) {
        setResolvedAttemptId(null);
        setError("No submitted attempts found for this exam yet.");
        return;
      }

      setResolvedAttemptId(latestAttemptId);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401) {
          handleUnauthorized();
          return;
        }

        if (status === 403) {
          setError(String(err.response?.data?.message ?? "You do not have access to this exam result."));
        } else {
          const message =
            err.response?.data?.message ||
            err.response?.data?.error ||
            "Failed to resolve latest attempt.";
          setError(String(message));
        }
      } else {
        setError("Failed to resolve latest attempt.");
      }
      setResolvedAttemptId(null);
    } finally {
      setResolvingAttempt(false);
    }
  }, [examIdNumber, handleUnauthorized, validExamId]);

  useEffect(() => {
    void resolveMostRecentAttempt();
  }, [resolveMostRecentAttempt]);

  const loadResult = useCallback(async () => {
    if (!resolvedAttemptId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setPending(false);
    setError(null);

    try {
      const payload = await getAttemptResult(resolvedAttemptId);
      setResult(payload);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401) {
          handleUnauthorized();
          return;
        }

        if (status === 403) {
          setPending(true);
        } else if (status === 404) {
          setError("Attempt result not found.");
        } else {
          const message =
            err.response?.data?.message ||
            err.response?.data?.error ||
            "Failed to load result.";
          setError(String(message));
        }
      } else {
        setError("Failed to load result.");
      }
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized, resolvedAttemptId]);

  useEffect(() => {
    void loadResult();
  }, [loadResult]);

  const sectionBreakdown = useMemo(
    () => (result ? deriveSectionBreakdown(result) : []),
    [result]
  );

  const questionGroups = useMemo(
    () => (result ? groupQuestionsBySection(result.responses) : []),
    [result]
  );

  const timeSpentSeconds = useMemo(
    () => (result ? getTimeSpentSeconds(result.attempt.started_at, result.attempt.submitted_at) : null),
    [result]
  );

  const finalRouteContext = useMemo(
    () =>
      mergeExamContentRouteContexts(initialRouteContext, resolvedExamRouteContext, {
        courseId: result?.exam.course_id ?? null,
        contentId: result?.exam.content_id ?? null,
      }),
    [initialRouteContext, resolvedExamRouteContext, result?.exam.content_id, result?.exam.course_id]
  );
  const fallbackPath = useMemo(
    () => buildExamContentRoutePath(finalRouteContext) ?? "/student/dashboard",
    [finalRouteContext]
  );
  const fallbackLabel = fallbackPath.includes("/content/") ? "Back to Content" : "Back to Exams";



  const showScore = Boolean(result?.visibility.show_score && result?.visibility.is_released);
  const showCorrectAnswers = Boolean(result?.visibility.show_solutions_to_user && result?.visibility.is_released);
  const showSolutions = showCorrectAnswers;
  const canShowReview = Boolean(result && result.visibility.is_released && result.responses.length > 0);

  if (resolvingAttempt || loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Loading exam result...</p>
        </div>
      </div>
    );
  }

  if (pending) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-amber-900">Result not available yet</h1>
          <p className="mt-2 text-sm text-amber-800">
            This exam result is currently locked based on exam visibility settings.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => {
                void loadResult();
              }}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => navigate(fallbackPath)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {fallbackLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-rose-700">Unable to load result</h1>
          <p className="mt-2 text-sm text-rose-700">{error ?? "No result data available."}</p>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => {
                void resolveMostRecentAttempt();
              }}
              className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => navigate(fallbackPath)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {fallbackLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <ResultSummaryCard result={result} studentName={user?.full_name ?? null} />

        {!showScore ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
            Score, marks, and pass/fail details are hidden by exam visibility settings.
          </div>
        ) : null}

        <ResultStatsGrid result={result} timeSpentSeconds={timeSpentSeconds} />

        <SectionBreakdownCard sections={sectionBreakdown} showScore={showScore} />

        {canShowReview ? (
          <QuestionReviewList
            groups={questionGroups}
            showMarks={showScore}
            showCorrectAnswer={showCorrectAnswers}
            showSolution={showSolutions}
          />
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Question Review</h2>
            <p className="mt-3 text-sm text-slate-600">Question-level review is not available for this attempt.</p>
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate(fallbackPath)}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {fallbackLabel}
          </button>

        </div>
      </div>
    </div>
  );
}

