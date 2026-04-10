import {
  getBlankIds,
  getOptionHtml,
  isMatchOptions,
  normalizeFillBlankAnswer,
  normalizeMatchAnswer,
} from "@/features/exam-runtime/questionHelpers";
import type { AttemptResultQuestionResponse, RuntimeOption } from "@/features/exam-runtime/types";

interface AnswerAnalysisBlockProps {
  question: AttemptResultQuestionResponse;
  showCorrectAnswer: boolean;
  showMarks: boolean;
}

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, "").trim();

const normalizeToken = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value).trim().toLowerCase();
};

const collectAnswerTokens = (value: unknown): Set<string> => {
  const tokens = new Set<string>();
  const push = (item: unknown) => {
    const token = normalizeToken(item);
    if (token) tokens.add(token);
  };

  if (Array.isArray(value)) {
    value.forEach((item) => push(item));
    return tokens;
  }

  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    if (Array.isArray(source.answer_ids)) {
      source.answer_ids.forEach((item) => push(item));
    }
    if (Array.isArray(source.answers)) {
      source.answers.forEach((item) => push(item));
    }
    if (source.answer !== undefined) {
      push(source.answer);
    }
    if (source.value !== undefined) {
      push(source.value);
    }
    return tokens;
  }

  push(value);
  return tokens;
};

const formatAnswerText = (value: unknown) => {
  if (value === null || value === undefined) return "Not Attempted";
  if (Array.isArray(value)) {
    if (!value.length) return "Not Attempted";
    return value.map((item) => String(item)).join(", ");
  }
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "number" || typeof value === "string") {
    const text = String(value).trim();
    return text.length ? text : "Not Attempted";
  }
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    if (Array.isArray(source.answer_ids)) return source.answer_ids.map(String).join(", ");
    if (Array.isArray(source.answers)) return source.answers.map(String).join(", ");
    if (source.answer !== undefined) return String(source.answer);
    if (source.value !== undefined) {
      const tolerance = source.tolerance !== undefined ? ` (±${source.tolerance})` : "";
      return `${source.value}${tolerance}`;
    }
  }
  return String(value);
};

const getOptionKeys = (option: RuntimeOption, index: number) => {
  const letter = String.fromCharCode(65 + index).toLowerCase();
  const numericIndex = String(index + 1);
  const zeroIndex = String(index);
  const id = normalizeToken(option.id);
  const text = normalizeToken(stripHtml(getOptionHtml(option.text)));
  return [id, letter, numericIndex, zeroIndex, text].filter(Boolean);
};

const buildOptionsForReview = (question: AttemptResultQuestionResponse): RuntimeOption[] => {
  if (Array.isArray(question.options) && question.options.length) return question.options;
  if (question.question_type === "true_false") {
    return [
      { id: "true", text: "True" },
      { id: "false", text: "False" },
    ];
  }
  return [];
};

const normalizeCorrectBlankAnswers = (value: unknown) => {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const blanks = Array.isArray(source.blanks) ? source.blanks : [];

  return blanks
    .map((item) => {
      const entry = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        id: String(entry.id ?? "").trim(),
        answers: Array.isArray(entry.answers) ? entry.answers.map((answer) => String(answer)) : [],
      };
    })
    .filter((item) => item.id);
};

const normalizeShortAnswerCorrectAnswers = (value: unknown) => {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const answers = Array.isArray(source.answers)
    ? source.answers.map((item) => String(item).trim()).filter(Boolean)
    : [];

  return {
    answers,
    caseSensitive: Boolean(source.case_sensitive),
  };
};

const renderMatchAnalysis = (question: AttemptResultQuestionResponse, showCorrectAnswer: boolean) => {
  if (!isMatchOptions(question.options)) {
    return (
      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Matching review is unavailable because the option data is malformed.
      </div>
    );
  }

  const studentMap = new Map(
    normalizeMatchAnswer(question.student_answer).pairs.map((pair) => [pair.left_id, pair.right_id])
  );
  const correctMap = new Map(
    (showCorrectAnswer ? normalizeMatchAnswer(question.correct_answer).pairs : []).map((pair) => [
      pair.left_id,
      pair.right_id,
    ])
  );
  const rightById = new Map(question.options.right.map((item) => [item.id, item]));

  return (
    <div className="mt-3 space-y-2">
      {question.options.left.map((leftOption, index) => {
        const selectedId = studentMap.get(leftOption.id) ?? "";
        const correctId = correctMap.get(leftOption.id) ?? "";
        const selectedOption = selectedId ? rightById.get(selectedId) : null;
        const correctOption = correctId ? rightById.get(correctId) : null;
        const isCorrectPair = Boolean(showCorrectAnswer && selectedId && correctId && selectedId === correctId);

        const rowClass = !question.is_attempted
          ? "border-amber-200 bg-amber-50"
          : isCorrectPair
            ? "border-emerald-300 bg-emerald-50"
            : selectedId && showCorrectAnswer
              ? "border-rose-300 bg-rose-50"
              : selectedId
                ? "border-blue-300 bg-blue-50"
                : "border-slate-200 bg-white";

        return (
          <div key={leftOption.id} className={`rounded-lg border px-3 py-3 ${rowClass}`}>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-xs font-semibold text-slate-600">{index + 1}.</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-800" dangerouslySetInnerHTML={{ __html: getOptionHtml(leftOption.text) }} />
                <p className="mt-2 text-xs text-slate-500">Student Match</p>
                <p className="text-sm font-medium text-slate-800">
                  {selectedOption ? stripHtml(getOptionHtml(selectedOption.text)) : "Not Answered"}
                </p>
                {showCorrectAnswer ? (
                  <>
                    <p className="mt-2 text-xs text-emerald-700">Correct Match</p>
                    <p className="text-sm font-medium text-emerald-800">
                      {correctOption ? stripHtml(getOptionHtml(correctOption.text)) : "Unavailable"}
                    </p>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const renderFillBlankAnalysis = (question: AttemptResultQuestionResponse, showCorrectAnswer: boolean) => {
  const studentBlanks = normalizeFillBlankAnswer(question.student_answer, question.blank_ids ?? []);
  const correctBlanks = normalizeCorrectBlankAnswers(question.correct_answer);
  const blankIds = getBlankIds(question).length
    ? getBlankIds(question)
    : Array.from(
        new Set([
          ...studentBlanks.blanks.map((item) => item.id),
          ...correctBlanks.map((item) => item.id),
        ])
      );

  const studentById = new Map(studentBlanks.blanks.map((item) => [item.id, item.value]));
  const correctById = new Map(correctBlanks.map((item) => [item.id, item.answers]));

  if (!blankIds.length) {
    return (
      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Fill-in-the-blank review is unavailable because the blank metadata is malformed.
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {blankIds.map((blankId, index) => {
        const studentValue = studentById.get(blankId) ?? "";
        const correctAnswers = correctById.get(blankId) ?? [];
        const normalizedStudent = normalizeToken(studentValue);
        const isCorrectBlank = Boolean(
          showCorrectAnswer &&
            normalizedStudent &&
            correctAnswers.some((answer) => normalizeToken(answer) === normalizedStudent)
        );

        const rowClass = !studentValue.trim()
          ? "border-amber-200 bg-amber-50"
          : isCorrectBlank
            ? "border-emerald-300 bg-emerald-50"
            : showCorrectAnswer
              ? "border-rose-300 bg-rose-50"
              : "border-blue-300 bg-blue-50";

        return (
          <div key={blankId} className={`rounded-lg border px-3 py-3 ${rowClass}`}>
            <p className="text-xs font-semibold text-slate-500">Blank {index + 1}</p>
            <p className="mt-1 text-sm font-medium text-slate-800">{studentValue.trim() || "Not Answered"}</p>
            {showCorrectAnswer ? (
              <>
                <p className="mt-2 text-xs font-semibold text-emerald-700">Accepted Answers</p>
                <p className="text-sm font-medium text-emerald-800">
                  {correctAnswers.length ? correctAnswers.join(", ") : "Unavailable"}
                </p>
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

const renderShortAnswerAnalysis = (
  question: AttemptResultQuestionResponse,
  showCorrectAnswer: boolean
) => {
  const studentAnswer = formatAnswerText(question.student_answer);
  const { answers, caseSensitive } = normalizeShortAnswerCorrectAnswers(question.correct_answer);

  return (
    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
        <p className="text-xs text-slate-500">Student Answer</p>
        <p className="mt-1 font-medium text-slate-800">{studentAnswer}</p>
      </div>
      {showCorrectAnswer ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <p className="text-xs text-emerald-700">Accepted Answers</p>
          <p className="mt-1 font-medium text-emerald-800">
            {answers.length ? answers.join(", ") : "Unavailable"}
          </p>
          <p className="mt-2 text-xs text-emerald-700">
            Matching: {caseSensitive ? "Case-sensitive" : "Case-insensitive"}
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default function AnswerAnalysisBlock({
  question,
  showCorrectAnswer,
  showMarks,
}: AnswerAnalysisBlockProps) {
  const options = buildOptionsForReview(question);
  const selectedTokens = collectAnswerTokens(question.student_answer);
  const correctTokens = showCorrectAnswer ? collectAnswerTokens(question.correct_answer) : new Set<string>();
  const hasOptionView = options.length > 0 && ["mcq_single", "mcq_multiple", "true_false"].includes(question.question_type);

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="text-sm font-semibold text-slate-800">Answer Analysis</h4>

      {!question.is_attempted ? (
        <p className="mt-2 text-sm font-medium text-amber-700">Not Attempted</p>
      ) : null}

      {question.question_type === "match_following" ? (
        renderMatchAnalysis(question, showCorrectAnswer)
      ) : question.question_type === "fill_in_blank" ? (
        renderFillBlankAnalysis(question, showCorrectAnswer)
      ) : question.question_type === "short_answer" ? (
        renderShortAnswerAnalysis(question, showCorrectAnswer)
      ) : hasOptionView ? (
        <div className="mt-3 space-y-2">
          {options.map((option, index) => {
            const keys = getOptionKeys(option, index);
            const isSelected = keys.some((key) => selectedTokens.has(key));
            const isCorrect = showCorrectAnswer && keys.some((key) => correctTokens.has(key));

            const rowClass = isSelected && isCorrect
              ? "border-emerald-300 bg-emerald-50"
              : isSelected && !isCorrect && showCorrectAnswer
                ? "border-rose-300 bg-rose-50"
                : !isSelected && isCorrect
                  ? "border-emerald-300 bg-emerald-50/60"
                  : isSelected
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-200 bg-white";

            return (
              <div key={`${option.id}-${index}`} className={`rounded-lg border px-3 py-2 ${rowClass}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-xs font-semibold text-slate-600">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <span className="text-sm text-slate-800" dangerouslySetInnerHTML={{ __html: getOptionHtml(option.text) }} />
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {isSelected ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                        Selected
                      </span>
                    ) : null}
                    {isCorrect ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Correct
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-xs text-slate-500">Student Answer</p>
            <p className="mt-1 font-medium text-slate-800">{formatAnswerText(question.student_answer)}</p>
          </div>
          {showCorrectAnswer ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="text-xs text-emerald-700">Correct Answer</p>
              <p className="mt-1 font-medium text-emerald-800">{formatAnswerText(question.correct_answer)}</p>
            </div>
          ) : null}
        </div>
      )}

      {showMarks ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
            Marks: {question.marks_awarded ?? "--"}
            {question.max_marks !== null && question.max_marks !== undefined ? ` / ${question.max_marks}` : ""}
          </span>
          {question.negative_marks !== null && question.negative_marks !== undefined && question.negative_marks > 0 ? (
            <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
              Negative Mark: -{question.negative_marks}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
