import { useEffect, useRef } from "react";
import { ensureMathJax } from "@/components/ui/mathjax";
import type { Question } from "@/types/questionBank";

interface QuestionPreviewProps {
  question: Question;
  showAnswer?: boolean;
}

const typeLabels: Record<string, string> = {
  mcq_single: "MCQ Single",
  mcq_multiple: "MCQ Multiple",
  numerical: "Numerical",
  true_false: "True/False",
};

export default function QuestionPreview({ question, showAnswer = false }: QuestionPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

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
  }, [question.question_text, question.options]);

  return (
    <div
      ref={containerRef}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold">
          {typeLabels[question.question_type]}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold">
          {question.difficulty_level.toUpperCase()}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold">
          +{question.marks_positive} / -{question.marks_negative}
        </span>
      </div>

      <div
        className="mt-4 text-sm text-slate-800"
        dangerouslySetInnerHTML={{ __html: question.question_text }}
      />

      {question.options?.length ? (
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          {question.options.map((option) => (
            <div
              key={option.id}
              className={`rounded-lg border px-3 py-2 ${
                showAnswer && option.is_correct
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200"
              }`}
            >
              <span dangerouslySetInnerHTML={{ __html: option.text || "Option" }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 text-sm text-slate-500">
          This question does not have options.
        </div>
      )}

      {showAnswer && question.correct_answer !== null && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Correct answer: {String(question.correct_answer)}
        </div>
      )}
    </div>
  );
}
