import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import type { QuestionFolder } from "@/types/questionFolder";

const normalizeFolder = (item: any): QuestionFolder => ({
  id: item.id,
  name: item.name ?? "Untitled Folder",
  description: item.description ?? "",
  questionCount: Number(item.questionCount ?? item.question_count ?? 0),
});

export default function QuestionFoldersPage() {
  const navigate = useNavigate();
  const [folders, setFolders] = useState<QuestionFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFolders = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/question-folders");
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
        setFolders(payload.map(normalizeFolder));
      } catch (err: any) {
        setFolders([]);
        setError(err?.response?.data?.error || "Failed to load folders");
      } finally {
        setLoading(false);
      }
    };

    loadFolders();
  }, []);

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
      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading folders...
        </div>
      ) : (
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
          {folders.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 lg:col-span-2">
              No folders found.
            </div>
          )}
        </div>
      )}
    </QuestionBankLayout>
  );
}
