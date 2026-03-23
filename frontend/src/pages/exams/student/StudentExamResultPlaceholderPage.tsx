import { useNavigate, useParams } from "react-router-dom";

export default function StudentExamResultPlaceholderPage() {
  const navigate = useNavigate();
  const { examId } = useParams<{ examId: string }>();

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <div className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
          Exam Result
        </span>
        <h1 className="mt-4 text-2xl font-bold">Coming soon</h1>
        <p className="mt-2 text-sm text-slate-600">
          Result details for exam {examId ? `#${examId}` : ""} will be available in a future update.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => navigate("/student/exams")}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Back to Exams
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
