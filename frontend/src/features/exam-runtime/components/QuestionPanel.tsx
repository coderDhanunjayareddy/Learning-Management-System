import QuestionRenderer from "@/components/questions/QuestionRenderer";
import InlineFillBlankQuestion, {
  getInlineBlankPlaceholderIds,
} from "@/features/exam-runtime/components/InlineFillBlankQuestion";
import MatchFollowingQuestion from "@/features/exam-runtime/components/MatchFollowingQuestion";
import {
  buildFillBlankAnswer,
  extractQuestionHtml,
  getBlankIds,
  getOptionHtml,
  isMatchOptions,
  normalizeFillBlankAnswer,
} from "@/features/exam-runtime/questionHelpers";
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
  match_following: "MATCH THE FOLLOWING",
  fill_in_blank: "FILL IN THE BLANK",
};

const normalizeMultiAnswer = (answer: unknown) => {
  if (Array.isArray(answer)) {
    return answer.map((item) => String(item));
  }

  if (answer && typeof answer === "object") {
    const source = answer as Record<string, unknown>;
    if (Array.isArray(source.answer_ids)) return source.answer_ids.map((item) => String(item));
    if (Array.isArray(source.answers)) return source.answers.map((item) => String(item));
  }

  return [];
};

const renderUnsupported = (message: string) => (
  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
    {message}
  </div>
);

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

  const questionHtml = extractQuestionHtml(question.question_text);
  const blankIds = getBlankIds(question);
  const placeholderIds = getInlineBlankPlaceholderIds(questionHtml);
  const orderedBlankIds = placeholderIds.length ? placeholderIds : blankIds;
  const fillBlankAnswer = normalizeFillBlankAnswer(answer, orderedBlankIds);
  const fillBlankValues = Object.fromEntries(fillBlankAnswer.blanks.map((item) => [item.id, item.value]));

  const typeLabel = questionTypeLabelMap[question.question_type] ?? question.question_type.toUpperCase();
  const marks = Number(question.marks_positive ?? 0).toFixed(2);
  const negative = Number(question.marks_negative ?? 0).toFixed(2);

  const renderPrompt = () => {
    if (question.question_type === "fill_in_blank") {
      const hasPlaceholderMismatch =
        blankIds.length > 0 && placeholderIds.length > 0 && placeholderIds.some((id) => !blankIds.includes(id));

      if (!orderedBlankIds.length || !questionHtml.includes("{{") || hasPlaceholderMismatch) {
        return renderUnsupported("This fill-in-the-blank question has invalid blank metadata.");
      }

      return (
        <InlineFillBlankQuestion
          html={questionHtml}
          valuesByBlankId={fillBlankValues}
          readOnly={readOnly}
          onBlankChange={(blankId, value) => {
            onAnswerChange(buildFillBlankAnswer(answer, orderedBlankIds, blankId, value));
          }}
        />
      );
    }

    return (
      <QuestionRenderer
        question={{
          question_type: question.question_type,
          question_text: question.question_text,
          options: question.question_type === "match_following" ? question.options : [],
          marks_positive: question.marks_positive ?? undefined,
          marks_negative: question.marks_negative ?? undefined,
        }}
        showMeta={false}
        showOptions={false}
        showComprehension={true}
        showEmptyState={false}
        contentClassName="text-lg leading-relaxed text-slate-900 md:text-xl"
      />
    );
  };

  const renderAnswerInput = () => {
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
                  <span dangerouslySetInnerHTML={{ __html: getOptionHtml(option.text) }} />
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
                      onAnswerChange(Array.from(selectedSet.values()).filter((value) => value !== option.id));
                    } else {
                      onAnswerChange([...Array.from(selectedSet.values()), option.id]);
                    }
                  }}
                  disabled={readOnly}
                  className="mt-1 h-5 w-5"
                />
                <span className="text-lg leading-relaxed text-slate-900 md:text-xl">
                  <span dangerouslySetInnerHTML={{ __html: getOptionHtml(option.text) }} />
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
                <span className="text-lg leading-relaxed text-slate-900 md:text-xl">{option.label}</span>
              </label>
            );
          })}
        </div>
      );
    }

    if (question.question_type === "match_following") {
      if (!isMatchOptions(question.options) || question.options.left.length === 0 || question.options.right.length === 0) {
        return renderUnsupported("This matching question has invalid option data.");
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

    return renderUnsupported("This question type is not supported in the current runtime.");
  };

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
          {renderPrompt()}
          {renderAnswerInput()}
        </div>
      </div>
    </section>
  );
}
