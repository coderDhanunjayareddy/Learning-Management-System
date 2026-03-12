import { useNavigate } from "react-router-dom";
import QuestionBankList from "@/features/question-bank/components/QuestionBankList";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";

export default function QuestionBankPage() {
  const navigate = useNavigate();

  return (
    <QuestionBankLayout
      title="Question Bank"
      description="Create, review, and organize assessment questions."
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate("/question-bank/bulk-upload")}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Bulk Upload
          </button>
          <button
            onClick={() => navigate("/question-bank/new")}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Create Question
          </button>
        </div>
      }
    >
      <QuestionBankList filtersPlacement="content" />
    </QuestionBankLayout>
  );
}
