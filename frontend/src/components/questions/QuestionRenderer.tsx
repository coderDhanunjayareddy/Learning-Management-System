import { useEffect, useRef } from "react";
import { ensureMathJax } from "@/components/ui/mathjax";
import { sanitizeHtml } from "@/utils/htmlSanitizer";

type RichTextLike = { html?: string | null } | string | null | undefined;

type QuestionOptionLike = {
  id?: string | number;
  text?: RichTextLike;
  is_correct?: boolean;
};

type MatchFollowingOptionsLike = {
  left?: QuestionOptionLike[];
  right?: QuestionOptionLike[];
};

type ComprehensiveQuestionLike = {
  id?: string | number;
  question_type?: string;
  question_text?: RichTextLike;
  options?: QuestionOptionLike[] | MatchFollowingOptionsLike;
  correct_answer?: unknown;
  marks_positive?: number;
  marks_negative?: number;
};

export interface RenderableQuestion {
  question_type?: string;
  question_text?: RichTextLike;
  options?: QuestionOptionLike[] | MatchFollowingOptionsLike | null;
  correct_answer?: unknown;
  solution?: RichTextLike | null;
  comprehension_passage?: RichTextLike | null;
  comprehension_questions?: ComprehensiveQuestionLike[] | null;
  difficulty_level?: string;
  marks_positive?: number;
  marks_negative?: number;
}

interface QuestionRendererProps {
  question: RenderableQuestion;
  showAnswer?: boolean;
  showMeta?: boolean;
  showSolution?: boolean;
  showOptions?: boolean;
  showComprehension?: boolean;
  showEmptyState?: boolean;
  contentClassName?: string;
  className?: string;
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  mcq_single: "MCQ Single",
  mcq_multiple: "MCQ Multiple",
  numerical: "Numerical",
  true_false: "True/False",
  short_answer: "Short Answer",
  match_following: "Match the Following",
  fill_in_blank: "Fill in the Blank",
  comprehensive: "Comprehensive",
};

const getHtml = (value: RichTextLike) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "html" in value) {
    return String(value.html ?? "");
  }
  return "";
};

const wrapTablesInHtml = (html: string) => {
  if (!html || typeof window === "undefined") return html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    doc.querySelectorAll("table").forEach((table) => {
      const parent = table.parentElement;
      if (parent && parent.classList.contains("question-table-wrap")) return;
      const wrapper = doc.createElement("div");
      wrapper.className = "question-table-wrap";
      parent?.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
    return doc.body.innerHTML;
  } catch (error) {
    return html;
  }
};

const renderHtml = (value: RichTextLike) => ({
  __html: sanitizeHtml(wrapTablesInHtml(getHtml(value))),
});

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, "").trim();

const formatOptionLabel = (option: QuestionOptionLike, index: number) => {
  const letter = String.fromCharCode(65 + index);
  const text = stripHtml(getHtml(option.text));
  return text ? `${letter}. ${text}` : letter;
};

const resolveOptionIndex = (options: QuestionOptionLike[], id: string) => {
  const optionIndexById = new Map(
    options.map((option, index) => [String(option.id ?? index), index])
  );
  const direct = optionIndexById.get(id);
  if (direct !== undefined) return direct;

  const normalized = id.trim();
  if (/^[a-z]$/i.test(normalized)) {
    const index = normalized.toUpperCase().charCodeAt(0) - 65;
    if (index >= 0 && index < options.length) return index;
  }

  if (/^\d+$/.test(normalized)) {
    const num = Number(normalized);
    if (num >= 1 && num <= options.length) return num - 1;
    if (num >= 0 && num < options.length) return num;
  }

  return undefined;
};

const resolveLabelsFromIds = (options: QuestionOptionLike[], ids: string[]) => {
  const labels = ids
    .map((id) => resolveOptionIndex(options, String(id)))
    .filter((index) => index !== undefined)
    .map((index) => formatOptionLabel(options[index as number], index as number));
  return labels.length ? labels : null;
};

const resolveCorrectFromOptions = (
  options: QuestionOptionLike[] | undefined,
  answer: unknown
) => {
  if (!options || options.length === 0) return null;
  if (typeof answer === "string") {
    const index = resolveOptionIndex(options, answer);
    if (index !== undefined) return formatOptionLabel(options[index], index);
  }

  if (typeof answer === "object" && answer) {
    const typed = answer as Record<string, unknown>;
    if (Array.isArray(typed.answer_ids)) {
      const labels = resolveLabelsFromIds(options, typed.answer_ids.map(String));
      if (labels) return labels.join(", ");
    }
    if (Array.isArray(typed.answers)) {
      const labels = resolveLabelsFromIds(options, typed.answers.map(String));
      if (labels) return labels.join(", ");
    }
    if (typeof typed.answer === "string") {
      const index = resolveOptionIndex(options, typed.answer);
      if (index !== undefined) return formatOptionLabel(options[index], index);
    }
  }

  const fallback = options
    .map((option, index) => (option.is_correct ? formatOptionLabel(option, index) : null))
    .filter(Boolean) as string[];
  if (fallback.length) return fallback.join(", ");

  return null;
};

const formatCorrectAnswer = (question: RenderableQuestion) => {
  const answer = question.correct_answer;
  if (answer === null || answer === undefined) return "";
  if (Array.isArray(question.options)) {
    const fromOptions = resolveCorrectFromOptions(question.options, answer);
    if (fromOptions) return fromOptions;
  }
  if (typeof answer === "string" || typeof answer === "number" || typeof answer === "boolean") {
    return String(answer);
  }
  if (typeof answer === "object") {
    const typed = answer as Record<string, unknown>;
    if (Array.isArray(typed.answer_ids)) return typed.answer_ids.join(", ");
    if (typed.answer !== undefined) return String(typed.answer);
    if (typed.value !== undefined) {
      const tolerance = typed.tolerance ?? 0;
      return `Value: ${typed.value} (±${tolerance})`;
    }
    if (Array.isArray(typed.answers)) return typed.answers.join(", ");
    if (Array.isArray(typed.pairs)) return `${typed.pairs.length} pairs`;
    if (Array.isArray(typed.blanks)) return `${typed.blanks.length} blanks`;
    if (typed.raw !== undefined) return String(typed.raw);
  }
  return "Available";
};

export default function QuestionRenderer({
  question,
  showAnswer = false,
  showMeta = true,
  showSolution = false,
  showOptions = true,
  showComprehension = true,
  showEmptyState = true,
  contentClassName,
  className,
}: QuestionRendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const questionHtml = getHtml(question.question_text);
  const passageHtml = getHtml(question.comprehension_passage);
  const solutionHtml = getHtml(question.solution);

  useEffect(() => {
    let mounted = true;
    const typeset = async () => {
      await ensureMathJax();
      if (!mounted || !window.MathJax || !containerRef.current) return;
      if (window.MathJax.typesetPromise) {
        await window.MathJax.typesetPromise([containerRef.current]);
      } else if (window.MathJax.typeset) {
        window.MathJax.typeset([containerRef.current]);
      }
    };
    typeset();
    return () => {
      mounted = false;
    };
  }, [questionHtml, passageHtml, solutionHtml, question.options, question.comprehension_questions]);

  const typeLabel =
    (question.question_type && QUESTION_TYPE_LABELS[question.question_type]) || "Question";
  const difficultyLabel = question.difficulty_level
    ? question.difficulty_level.toUpperCase()
    : "N/A";
  const marksPositive = question.marks_positive ?? 0;
  const marksNegative = question.marks_negative ?? 0;

  const renderOptions = () => {
    if (!showOptions) return null;
    if (Array.isArray(question.options) && question.options.length) {
      return (
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          {question.options.map((option, index) => (
            <div
              key={option.id ?? Math.random().toString(36)}
              className="rounded-lg border border-slate-200 px-3 py-2"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    showAnswer && option.is_correct
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {String.fromCharCode(65 + index)}
                </span>
                <span dangerouslySetInnerHTML={renderHtml(option.text)} />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (question.question_type === "match_following" && question.options) {
      const matchOptions = question.options as MatchFollowingOptionsLike;
      return (
        <div className="mt-4 text-sm text-slate-700">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-slate-500">Left</div>
              {matchOptions.left?.map((item) => (
                <div key={item.id ?? Math.random().toString(36)} className="mt-2 rounded-lg border border-slate-200 px-3 py-2">
                  <span dangerouslySetInnerHTML={renderHtml(item.text)} />
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">Right</div>
              {matchOptions.right?.map((item) => (
                <div key={item.id ?? Math.random().toString(36)} className="mt-2 rounded-lg border border-slate-200 px-3 py-2">
                  <span dangerouslySetInnerHTML={renderHtml(item.text)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderComprehensive = () => {
    if (!showComprehension) return null;
    if (question.question_type !== "comprehensive" || !question.comprehension_passage) return null;

    return (
      <div className="mt-4 space-y-3 text-sm text-slate-700">
        <div>
          <div className="text-xs font-semibold text-slate-500">Passage</div>
          <div className="mt-2" dangerouslySetInnerHTML={renderHtml(question.comprehension_passage)} />
        </div>
        {question.comprehension_questions?.length ? (
          <div>
            <div className="text-xs font-semibold text-slate-500">Sub-Questions</div>
            <div className="mt-2 space-y-2">
              {question.comprehension_questions.map((sub) => (
                <div key={sub.id ?? Math.random().toString(36)} className="rounded-lg border border-slate-200 px-3 py-2">
                  <div className="text-xs font-semibold text-slate-500">
                    {(sub.question_type && QUESTION_TYPE_LABELS[sub.question_type]) || "Question"}
                  </div>
                  <div dangerouslySetInnerHTML={renderHtml(sub.question_text)} />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const optionsContent = renderOptions();
  const comprehensiveContent = renderComprehensive();
  const showEmptyOptions =
    showEmptyState &&
    !optionsContent &&
    !comprehensiveContent &&
    question.question_type !== "short_answer" &&
    question.question_type !== "numerical";

  return (
    <div ref={containerRef} className={`question-render ${className ?? ""}`.trim()}>
      {showMeta && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold">{typeLabel}</span>
          <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold">{difficultyLabel}</span>
          <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold">
            +{marksPositive} / -{marksNegative}
          </span>
        </div>
      )}

      <div
        className={
          contentClassName ??
          (showMeta ? "mt-4 text-sm text-slate-800" : "text-sm text-slate-800")
        }
        dangerouslySetInnerHTML={renderHtml(question.question_text)}
      />

      {optionsContent}
      {comprehensiveContent}

      {showEmptyOptions ? (
        <div className="mt-4 text-sm text-slate-500">This question does not have options.</div>
      ) : null}

      {showSolution && solutionHtml ? (
        <div className="mt-4">
          <div className="text-xs font-semibold text-slate-500">Solution</div>
          <div className="mt-2 text-sm text-slate-700" dangerouslySetInnerHTML={renderHtml(question.solution)} />
        </div>
      ) : null}

      {showAnswer && question.correct_answer !== null && question.correct_answer !== undefined ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Correct answer: {formatCorrectAnswer(question)}
        </div>
      ) : null}
    </div>
  );
}
