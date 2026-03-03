import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import { mockFolders, type QuestionFolder } from "@/features/question-bank/data/mockFolders";

export default function QuestionFoldersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [folders, setFolders] = useState<QuestionFolder[]>(mockFolders);

  useEffect(() => {
    const state = location.state as
      | { createdFolder?: QuestionFolder; updatedFolder?: QuestionFolder }
      | null;
    if (state?.createdFolder) {
      setFolders((prev) => [state.createdFolder as QuestionFolder, ...prev]);
    }
    if (state?.updatedFolder) {
      setFolders((prev) =>
        prev.map((item) =>
          item.id === state.updatedFolder?.id
            ? (state.updatedFolder as QuestionFolder)
            : item
        )
      );
    }
    if (state) {
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.state, navigate]);

  return (
    <QuestionBankLayout
      title="Folders"
      description="Group questions into reusable folders."
      actions={
        <button
          onClick={() => navigate("/question-bank/folders/new")}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          New Folder
        </button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {folders.map((folder) => (
          <div
            key={folder.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{folder.name}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {folder.description || "No description yet."}
                </p>
              </div>
              <div className="text-xs text-slate-400">{folder.questionCount} questions</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => navigate(`/question-bank/bulk-upload?folderId=${folder.id}`)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Upload to Folder
              </button>
              <button
                onClick={() => navigate(`/question-bank/folders/${folder.id}/edit`)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </QuestionBankLayout>
  );
}
