import QuestionRenderer from "@/components/questions/QuestionRenderer";
import type { AttemptResultQuestionResponse } from "@/features/exam-runtime/types";
import AnswerAnalysisBlock from "@/features/exam-runtime/components/result/AnswerAnalysisBlock";
import SolutionBlock from "@/features/exam-runtime/components/result/SolutionBlock";
import { getReviewStatus } from "@/features/exam-runtime/components/result/resultUtils";

interface ReviewQuestionCardProps {
  question: AttemptResultQuestionResponse;
  questionSerial: number;
  showMarks: boolean;
  showCorrectAnswer: boolean;
  showSolution: boolean;
}

const statusClasses: Record<ReturnType<typeof getReviewStatus>, string> = {
  correct: "bg-emerald-100 text-emerald-700",
  wrong: "bg-rose-100 text-rose-700",
  unattempted: "bg-amber-100 text-amber-700",
  attempted: "bg-blue-100 text-blue-700",
};

const statusLabels: Record<ReturnType<typeof getReviewStatus>, string> = {
  correct: "Correct",
  wrong: "Wrong",
  unattempted: "Unattempted",
  attempted: "Attempted",
};

export default function ReviewQuestionCard({
  question,
  questionSerial,
  showMarks,
  showCorrectAnswer,
  showSolution,
}: ReviewQuestionCardProps) {
  const status = getReviewStatus(question);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-900">Question {questionSerial}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClasses[status]}`}>
            {statusLabels[status]}
          </span>
          {question.is_marked_for_review ? (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
              Marked for Review
            </span>
          ) : null}
        </div>
        {showMarks ? (
          <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
            {question.marks_awarded ?? "--"}
            {question.max_marks !== null && question.max_marks !== undefined ? ` / ${question.max_marks}` : ""} marks
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {question.section_title || `Section ${question.section_id}`} • {question.question_type}
      </p>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <QuestionRenderer
          question={{
            question_type: question.question_type,
            question_text: question.question_text,
            options: question.options,
            correct_answer: question.correct_answer,
          }}
          showMeta={false}
          showOptions={question.question_type === "match_following"}
          showComprehension={true}
          showEmptyState={false}
        />
      </div>

      <AnswerAnalysisBlock
        question={question}
        showCorrectAnswer={showCorrectAnswer}
        showMarks={showMarks}
      />

      <SolutionBlock question={question} visible={showSolution} />
    </article>
  );
}
