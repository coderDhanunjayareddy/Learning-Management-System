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
};

interface QuestionCardProps {
  question: Question;
  permissions: QuestionPermissions;
  onView: (question: Question) => void;
  onEdit: (question: Question) => void;
  onDelete?: (question: Question) => void;
  onApprove: (question: Question) => void;
  onReject: (question: Question) => void;
}

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, "").trim();

export default function QuestionCard({
  question,
  permissions,
  onView,
  onEdit,
  onDelete,
  onApprove,
  onReject,
}: QuestionCardProps) {
  const isEditable = permissions.canEdit;
  const questionPreview = stripHtml(question.question_text);

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

      <div className="text-sm font-semibold text-slate-900">
        {questionPreview.slice(0, 220)}
        {questionPreview.length > 220 ? "..." : ""}
      </div>

      {question.options?.length ? (
        <div className="space-y-2 text-sm text-slate-600">
          {question.options.slice(0, 4).map((option, index) => (
            <div
              key={option.id}
              className="flex items-center gap-3 py-1"
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${option.is_correct ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
              >
                {String.fromCharCode(65 + index)}
              </span>
              <span>{stripHtml(option.text || "Option")}</span>
            </div>
          ))}
        </div>
      ) : null}

      {question.review_note && (
        <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          Reviewer note: {question.review_note}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onView(question)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Preview
        </button>
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
