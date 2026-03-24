import type { AttemptResultResponse } from "@/features/exam-runtime/types";
import { formatDateTime, formatPercent } from "@/features/exam-runtime/components/result/resultUtils";

interface ResultSummaryCardProps {
  result: AttemptResultResponse;
  studentName?: string | null;
}

export default function ResultSummaryCard({ result, studentName }: ResultSummaryCardProps) {
  const scoreVisible = result.visibility.show_score && result.visibility.is_released;
  const passFailVisible =
    result.visibility.show_pass_or_fail &&
    scoreVisible &&
    result.summary.is_passed !== null;
  const rankVisible =
    result.exam.rank !== null &&
    result.exam.rank !== undefined &&
    Number.isFinite(result.exam.rank);
  const percentileVisible =
    result.exam.percentile !== null &&
    result.exam.percentile !== undefined &&
    Number.isFinite(result.exam.percentile);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Result Summary</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">{result.exam.title}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Attempt #{result.attempt.attempt_number} • Submitted {formatDateTime(result.attempt.submitted_at)}
          </p>
        </div>
        {passFailVisible ? (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              result.summary.is_passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            }`}
          >
            {result.summary.is_passed ? "Passed" : "Failed"}
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {studentName ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Student</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{studentName}</p>
          </div>
        ) : null}

        {scoreVisible ? (
          <>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Total Marks</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {result.summary.total_score ?? "--"}
                {result.summary.total_possible_marks !== null
                  ? ` / ${result.summary.total_possible_marks}`
                  : ""}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Percentage</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatPercent(result.summary.percentage)}
              </p>
            </div>
          </>
        ) : null}

        {rankVisible ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Rank</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{result.exam.rank}</p>
          </div>
        ) : null}

        {percentileVisible ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Percentile</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{formatPercent(result.exam.percentile)}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
