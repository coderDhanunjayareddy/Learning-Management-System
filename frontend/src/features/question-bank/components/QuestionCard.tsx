import QuestionRenderer from "@/components/questions/QuestionRenderer";
import type { Question } from "@/types/questionBank";
import type { QuestionPermissions } from "@/features/question-bank/utils/questionPermissions";

const statusStyles: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-700",
  draft: "bg-amber-100 text-amber-700",
  rejected: "bg-rose-100 text-rose-700",
};

const typeLabels: Record<string, string> = {
  mcq_single: "MCQ Single",
  mcq_multiple: "MCQ Multiple",
  numerical: "Numerical",
  true_false: "True/False",
  short_answer: "Short Answer",
  match_following: "Match the Following",
  fill_in_blank: "Fill in the Blank",
  comprehensive: "Comprehensive",
};


interface QuestionCardProps {
  question: Question;
  permissions: QuestionPermissions;
  onEdit: (question: Question) => void;
  onDelete?: (question: Question) => void;
  onApprove: (question: Question) => void;
  onReject: (question: Question) => void;
}

export default function QuestionCard({
  question,
  permissions,
  onEdit,
  onDelete,
  onApprove,
  onReject,
}: QuestionCardProps) {
  const isEditable = permissions.canEdit;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white shadow-sm">
            {String(question.id).slice(-2)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
              <span className={`rounded-full px-2 py-0.5 ${statusStyles[question.status]}`}>
                {question.status.toUpperCase()}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5">
                {typeLabels[question.question_type]}
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5">
                {question.difficulty_level.toUpperCase()}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {question.created_at ? new Date(question.created_at).toLocaleDateString() : "Draft"}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
          <span className="rounded-full bg-slate-50 px-2 py-1">
            +{question.marks_positive} / -{question.marks_negative}
          </span>
          {question.exam_tags?.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-50 px-2 py-1">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <QuestionRenderer
        question={question}
        showMeta={false}
        showAnswer
        showSolution
        contentClassName="text-sm font-semibold text-slate-900"
      />

      {question.review_note && (
        <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          Reviewer note: {question.review_note}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {isEditable && (
          <button
            onClick={() => onEdit(question)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Edit
          </button>
        )}
        {permissions.canDelete && onDelete && (
          <button
            onClick={() => onDelete(question)}
            className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
          >
            Delete
          </button>
        )}
        {permissions.canApprove && question.status === "draft" && (
          <button
            onClick={() => onApprove(question)}
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
          >
            Approve
          </button>
        )}
        {permissions.canReject && question.status === "draft" && (
          <button
            onClick={() => onReject(question)}
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
          >
            Reject
          </button>
        )}
      </div>
    </div>
  );
}
