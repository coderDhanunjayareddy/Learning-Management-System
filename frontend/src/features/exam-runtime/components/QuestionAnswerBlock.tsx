import MathHtml from "@/features/exam-runtime/components/MathHtml";
import MatchFollowingQuestion from "@/features/exam-runtime/components/MatchFollowingQuestion";
import {
  getOptionHtml,
  isMatchOptions,
} from "@/features/exam-runtime/questionHelpers";
import type { RuntimeQuestion } from "@/features/exam-runtime/types";

interface QuestionAnswerBlockProps {
  question: RuntimeQuestion;
  answer: unknown;
  readOnly: boolean;
  onAnswerChange: (value: unknown) => void;
}

const normalizeMultiAnswer = (answer: unknown) => {
  if (Array.isArray(answer)) {
    return answer.map((item) => String(item));
  }

  if (answer && typeof answer === "object") {
    const source = answer as Record<string, unknown>;
    if (Array.isArray(source.answer_ids)) {
      return source.answer_ids.map((item) => String(item));
    }
    if (Array.isArray(source.answers)) {
      return source.answers.map((item) => String(item));
    }
  }

  return [];
};

const normalizeTextAnswer = (answer: unknown) => {
  if (typeof answer === "string") return answer;
  if (typeof answer === "number") return String(answer);

  if (answer && typeof answer === "object") {
    const source = answer as Record<string, unknown>;
    if (typeof source.answer === "string") return source.answer;
    if (typeof source.value === "string") return source.value;
    if (typeof source.raw === "string") return source.raw;
  }

  return "";
};

const renderUnsupported = (message: string) => (
  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
    {message}
  </div>
);

export default function QuestionAnswerBlock({
  question,
  answer,
  readOnly,
  onAnswerChange,
}: QuestionAnswerBlockProps) {
  const selectedSingle =
    typeof answer === "string" || typeof answer === "number"
      ? String(answer)
      : typeof answer === "boolean"
        ? String(answer)
        : "";

  if (question.question_type === "mcq_single") {
    const options = Array.isArray(question.options) ? question.options : [];
    return (
      <div className="space-y-2 pt-2">
        {options.map((option) => {
          const checked = selectedSingle === option.id;
          return (
            <label
              key={option.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-1.5 transition-colors ${
                checked
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
                <MathHtml html={getOptionHtml(option.text)} />
              </span>
            </label>
          );
        })}
      </div>
    );
  }

  if (question.question_type === "mcq_multiple") {
    const options = Array.isArray(question.options) ? question.options : [];
    const selectedSet = new Set(normalizeMultiAnswer(answer));
    return (
      <div className="space-y-2 pt-2">
        {options.map((option) => {
          const checked = selectedSet.has(option.id);
          return (
            <label
              key={option.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-1.5 transition-colors ${
                checked
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 hover:border-blue-300 hover:bg-blue-50"
              } ${readOnly ? "cursor-not-allowed opacity-80" : ""}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  if (checked) {
                    onAnswerChange(
                      Array.from(selectedSet.values()).filter(
                        (value) => value !== option.id
                      )
                    );
                  } else {
                    onAnswerChange([
                      ...Array.from(selectedSet.values()),
                      option.id,
                    ]);
                  }
                }}
                disabled={readOnly}
                className="mt-1 h-5 w-5"
              />
              <span className="text-lg leading-relaxed text-slate-900 md:text-xl">
                <MathHtml html={getOptionHtml(option.text)} />
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
          className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 md:text-lg"
          placeholder="Type your answer"
        />
      </div>
    );
  }

  if (question.question_type === "short_answer") {
    return (
      <div className="pt-2">
        <textarea
          value={normalizeTextAnswer(answer)}
          onChange={(event) => onAnswerChange(event.target.value)}
          disabled={readOnly}
          rows={4}
          className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 md:text-lg"
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
        {[{ label: "True", value: "true" }, { label: "False", value: "false" }].map(
          (option) => {
            const checked = value === option.value;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-1.5 transition-colors ${
                  checked
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
                <span className="text-lg leading-relaxed text-slate-900 md:text-xl">
                  {option.label}
                </span>
              </label>
            );
          }
        )}
      </div>
    );
  }

  if (question.question_type === "match_following") {
    if (
      !isMatchOptions(question.options) ||
      question.options.left.length === 0 ||
      question.options.right.length === 0
    ) {
      return renderUnsupported(
        "This matching question has invalid option data."
      );
    }

    return (
      <MatchFollowingQuestion
        options={question.options}
        answer={answer}
        readOnly={readOnly}
        onAnswerChange={onAnswerChange}
      />
    );
  }

  if (question.question_type === "fill_in_blank") {
    return (
      <p className="pt-2 text-sm text-slate-500">
        Type your answers directly into the blanks above.
      </p>
    );
  }

  return renderUnsupported(
    "This question type is not supported in the current runtime."
  );
}
