import type { AttemptResultQuestionResponse } from "@/features/exam-runtime/types";

interface SolutionBlockProps {
  question: AttemptResultQuestionResponse;
  visible: boolean;
}

const getHtml = (value: unknown) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "html" in (value as Record<string, unknown>)) {
    const html = (value as { html?: string | null }).html;
    return typeof html === "string" ? html : "";
  }
  return "";
};

export default function SolutionBlock({ question, visible }: SolutionBlockProps) {
  const solutionHtml = getHtml(question.solution);
  if (!visible || !solutionHtml) return null;

  return (
    <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4">
      <h4 className="text-sm font-semibold text-sky-800">Solution</h4>
      <div className="prose prose-sm mt-2 max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: solutionHtml }} />
      {question.solution_video_url ? (
        <a
          href={question.solution_video_url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex text-xs font-semibold text-sky-700 underline"
        >
          View solution video
        </a>
      ) : null}
    </div>
  );
}
