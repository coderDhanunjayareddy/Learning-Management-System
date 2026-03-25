import type { AttemptResultResponse } from "@/features/exam-runtime/types";
import { formatDuration } from "@/features/exam-runtime/components/result/resultUtils";

interface ResultStatsGridProps {
  result: AttemptResultResponse;
  timeSpentSeconds: number | null;
}

interface StatItem {
  label: string;
  value: string | number;
  tone?: "neutral" | "success" | "danger" | "warning";
}

export default function ResultStatsGrid({ result, timeSpentSeconds }: ResultStatsGridProps) {
  const scoreVisible = result.visibility.show_score && result.visibility.is_released;

  const stats: StatItem[] = [
    { label: "Total Questions", value: result.summary.total_questions },
    { label: "Answered", value: result.summary.attempted, tone: "neutral" },
    { label: "Unattempted", value: result.summary.unattempted, tone: "warning" },
  ];

  if (scoreVisible) {
    stats.push({
      label: "Correct",
      value: result.summary.correct ?? "--",
      tone: "success",
    });
    stats.push({
      label: "Wrong",
      value: result.summary.wrong ?? "--",
      tone: "danger",
    });
  }

  if (timeSpentSeconds !== null) {
    stats.push({
      label: "Time Spent",
      value: formatDuration(timeSpentSeconds),
    });
  }

  const toneClass: Record<NonNullable<StatItem["tone"]>, string> = {
    neutral: "bg-blue-50 text-blue-700 border-blue-100",
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
    danger: "bg-rose-50 text-rose-700 border-rose-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100",
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Summary Stats</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stats.map((item) => (
          <article
            key={item.label}
            className={`rounded-xl border p-3 ${
              item.tone ? toneClass[item.tone] : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            <p className="text-xs">{item.label}</p>
            <p className="mt-1 text-lg font-semibold">{item.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
