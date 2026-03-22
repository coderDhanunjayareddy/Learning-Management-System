import QuestionRenderer from "@/components/questions/QuestionRenderer";
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
};

const getOptionHtml = (value: RuntimeQuestion["options"][number]["text"]) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof value.html === "string") return value.html;
  if (value === null || value === undefined) return "";
  return String(value);
};

const normalizeMultiAnswer = (answer: unknown) =>
  Array.isArray(answer) ? answer.map((item) => String(item)) : [];

export default function QuestionPanel({ question, answer, readOnly, onAnswerChange }: QuestionPanelProps) {
  if (!question) {
    return (
      <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">No question available for this section.</p>
      </section>
    );
  }

  const selectedSingle =
    typeof answer === "string" || typeof answer === "number"
      ? String(answer)
      : typeof answer === "boolean"
        ? String(answer)
        : "";

  const typeLabel = questionTypeLabelMap[question.question_type] ?? question.question_type.toUpperCase();
  const marks = Number(question.marks_positive ?? 0).toFixed(2);
  const negative = Number(question.marks_negative ?? 0).toFixed(2);

  const renderAnswerInput = () => {
    if (question.question_type === "mcq_single") {
      return (
        <div className="space-y-2 pt-2">
          {question.options.map((option, index) => {
            const checked = selectedSingle === option.id;
            return (
              <label
                key={option.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors ${checked
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                  } ${readOnly ? "cursor-not-allowed opacity-80" : ""}`}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  checked={checked}
                  onChange={() => onAnswerChange(option.id)}
                  disabled={readOnly}
                  className="mt-1 h-5 w-5"
                />
                <span className="text-lg leading-relaxed text-slate-900 md:text-xl">
                  {String.fromCharCode(65 + index)}. <span dangerouslySetInnerHTML={{ __html: getOptionHtml(option.text) }} />
                </span>
              </label>
            );
          })}
        </div>
      );
    }

    if (question.question_type === "mcq_multiple") {
      const selectedSet = new Set(normalizeMultiAnswer(answer));
      return (
        <div className="space-y-2 pt-2">
          {question.options.map((option, index) => {
            const checked = selectedSet.has(option.id);
            return (
              <label
                key={option.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors ${checked
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                  } ${readOnly ? "cursor-not-allowed opacity-80" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    if (checked) {
                      onAnswerChange(Array.from(selectedSet.values()).filter((value) => value !== option.id));
                    } else {
                      onAnswerChange([...Array.from(selectedSet.values()), option.id]);
                    }
                  }}
                  disabled={readOnly}
                  className="mt-1 h-5 w-5"
                />
                <span className="text-lg leading-relaxed text-slate-900 md:text-xl">
                  {String.fromCharCode(65 + index)}. <span dangerouslySetInnerHTML={{ __html: getOptionHtml(option.text) }} />
                </span>
              </label>
            );
          })}
        </div>
      );
    }

    if (question.question_type === "numerical") {
      return (
        <div className="pt-2">
          <input
            type="text"
            inputMode="decimal"
            value={answer === null || answer === undefined ? "" : String(answer)}
            onChange={(event) => onAnswerChange(event.target.value)}
            disabled={readOnly}
            className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base text-slate-900 focus:border-blue-500 md:text-lg focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            placeholder="Type your answer"
          />
        </div>
      );
    }

    if (question.question_type === "true_false") {
      const value =
        typeof answer === "boolean"
          ? String(answer)
          : typeof answer === "string"
            ? answer.toLowerCase()
            : "";

      return (
        <div className="space-y-2 pt-2">
          {[{ label: "True", value: "true" }, { label: "False", value: "false" }].map((option) => {
            const checked = value === option.value;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 transition-colors ${checked
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                  } ${readOnly ? "cursor-not-allowed opacity-80" : ""}`}
              >
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  checked={checked}
                  onChange={() => onAnswerChange(option.value)}
                  disabled={readOnly}
                  className="mt-1 h-5 w-5"
                />
                <span className="text-lg leading-relaxed text-slate-900 md:text-xl">{option.label}</span>
              </label>
            );
          })}
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        This question type is not supported in the current MVP runtime.
      </div>
    );
  };

  return (
    <section className="h-full overflow-hidden bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-300 px-4 py-2">
        <p className="text-xl font-semibold text-[#eb6d3b] md:text-xl">Question Type: {typeLabel}</p>
        <p className="text-xl font-semibold text-slate-900 md:text-xl">
          Mark/s: <span className="text-emerald-600">{marks}</span> | Negative Mark/s: <span className="text-red-500">{negative}</span>
        </p>
      </div>

      <div className="border-b border-slate-300 px-4 py-2">
        <p className="text-2xl font-semibold text-slate-900 md:text-2xl">Question No. {question.sequence}.</p>
      </div>

      <div className="h-[calc(100%-145px)] overflow-y-auto px-4 py-2">
        <div className="space-y-3">
          <QuestionRenderer
            question={{
              question_type: question.question_type,
              question_text: question.question_text,
              options: [],
              marks_positive: question.marks_positive ?? undefined,
              marks_negative: question.marks_negative ?? undefined,
            }}
            showMeta={false}
            showOptions={false}
            showComprehension={true}
            showEmptyState={false}
            contentClassName="text-lg leading-relaxed text-slate-900 md:text-xl"
          />

          {renderAnswerInput()}
        </div>
      </div>
    </section>
  );
}

