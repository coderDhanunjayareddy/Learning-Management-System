import QuestionAnswerBlock from "@/features/exam-runtime/components/QuestionAnswerBlock";
import QuestionPromptBlock from "@/features/exam-runtime/components/QuestionPromptBlock";
import type { RuntimeQuestion } from "@/features/exam-runtime/types";

interface QuestionPanelProps {
  question: RuntimeQuestion | null;
  answer: unknown;
  readOnly: boolean;
  onAnswerChange: (value: unknown) => void;
}

const questionTypeLabelMap: Record<string, string> = {
  mcq_single: "MCQ",
  mcq_multiple: "MCQ",
  numerical: "NUMERICAL",
  true_false: "TRUE/FALSE",
  short_answer: "SHORT ANSWER",
  match_following: "MATCH THE FOLLOWING",
  fill_in_blank: "FILL IN THE BLANK",
};

export default function QuestionPanel({ question, answer, readOnly, onAnswerChange }: QuestionPanelProps) {
  if (!question) {
    return (
      <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">No question available for this section.</p>
      </section>
    );
  }

  const typeLabel = questionTypeLabelMap[question.question_type] ?? question.question_type.toUpperCase();
  const marks = Number(question.marks_positive ?? 0).toFixed(2);
  const negative = Number(question.marks_negative ?? 0).toFixed(2);

  return (
    <section className="flex h-full flex-col overflow-hidden shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-300 px-4 py-1">
        <p className="text-m font-semibold text-[#eb6d3b] md:text-m">Question Type: {typeLabel}</p>
        <p className="text-m font-semibold text-slate-900 md:text-m">
          Mark/s: <span className="text-emerald-600">{marks}</span> | Negative Mark/s: <span className="text-red-500">{negative}</span>
        </p>
      </div>

      <div className="border-b border-slate-300 px-4 py-2">
        <p className="text-xl font-semibold text-slate-900 md:text-xl">Question No : {question.sequence}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
        <div className="space-y-3">
          <QuestionPromptBlock
            question={question}
            answer={answer}
            readOnly={readOnly}
            onAnswerChange={onAnswerChange}
          />
          <QuestionAnswerBlock
            question={question}
            answer={answer}
            readOnly={readOnly}
            onAnswerChange={onAnswerChange}
          />
        </div>
      </div>
    </section>
  );
}
