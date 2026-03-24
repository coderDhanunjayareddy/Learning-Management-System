import { useMemo, useState } from "react";
import ReviewQuestionCard from "@/features/exam-runtime/components/result/ReviewQuestionCard";
import type { QuestionSectionGroup } from "@/features/exam-runtime/components/result/resultUtils";
import { getReviewStatus, toQuestionSerial } from "@/features/exam-runtime/components/result/resultUtils";

interface QuestionReviewListProps {
  groups: QuestionSectionGroup[];
  showMarks: boolean;
  showCorrectAnswer: boolean;
  showSolution: boolean;
}

const statusBadgeClass: Record<ReturnType<typeof getReviewStatus>, string> = {
  correct: "bg-emerald-100 text-emerald-700",
  wrong: "bg-rose-100 text-rose-700",
  unattempted: "bg-amber-100 text-amber-700",
  attempted: "bg-blue-100 text-blue-700",
};

const statusBadgeLabel: Record<ReturnType<typeof getReviewStatus>, string> = {
  correct: "Correct",
  wrong: "Wrong",
  unattempted: "Unattempted",
  attempted: "Attempted",
};

export default function QuestionReviewList({
  groups,
  showMarks,
  showCorrectAnswer,
  showSolution,
}: QuestionReviewListProps) {
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});

  const serialMap = useMemo(() => {
    const map = new Map<number, number>();
    let serial = 1;
    groups.forEach((group) => {
      group.questions.forEach((question) => {
        map.set(question.question_id, serial);
        serial += 1;
      });
    });
    return map;
  }, [groups]);

  const toggleRow = (rowKey: string) => {
    setOpenRows((prev) => ({
      ...prev,
      [rowKey]: !prev[rowKey],
    }));
  };

  if (!groups.length) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Question Review</h2>
        <p className="mt-3 text-sm text-slate-600">No questions found for this attempt.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Question Review</h2>
      <p className="mt-1 text-xs text-slate-500">Read-only review of submitted responses.</p>

      <div className="mt-4 space-y-5">
        {groups.map((group) => (
          <div key={group.section_id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <h3 className="text-sm font-semibold text-slate-800">{group.section_title}</h3>
            <div className="mt-3 space-y-2">
              {group.questions.map((question, index) => {
                const status = getReviewStatus(question);
                const questionSerial =
                  serialMap.get(question.question_id) ?? toQuestionSerial(question, index + 1);
                const rowKey = `${group.section_id}-${question.question_id}-${index}`;
                const expanded = Boolean(openRows[rowKey]);

                return (
                  <div key={rowKey} className="rounded-lg border border-slate-200 bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">Q{questionSerial}</p>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass[status]}`}>
                          {statusBadgeLabel[status]}
                        </span>
                        {showMarks ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                            {question.marks_awarded ?? "--"}
                            {question.max_marks !== null && question.max_marks !== undefined
                              ? ` / ${question.max_marks}`
                              : ""}{" "}
                            marks
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleRow(rowKey)}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {expanded ? "Hide Review" : "View Review"}
                      </button>
                    </div>

                    {expanded ? (
                      <div className="border-t border-slate-200 p-3">
                        <ReviewQuestionCard
                          question={question}
                          questionSerial={questionSerial}
                          showMarks={showMarks}
                          showCorrectAnswer={showCorrectAnswer}
                          showSolution={showSolution}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
