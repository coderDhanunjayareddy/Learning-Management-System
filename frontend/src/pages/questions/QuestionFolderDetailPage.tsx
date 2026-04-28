import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import QuestionBankList from "@/features/question-bank/components/QuestionBankList";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import { getQuestionPermissions } from "@/features/question-bank/utils/questionPermissions";
import type { QuestionFolder } from "@/types/questionFolder";

const normalizeFolder = (item: any): QuestionFolder => ({
  id: item.id,
  name: item.name ?? "Untitled Folder",
  description: item.description ?? "",
  questionCount: Number(item.questionCount ?? item.question_count ?? 0),
});

export default function QuestionFolderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissions = getQuestionPermissions(user);

  const [folder, setFolder] = useState<QuestionFolder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [listKey, setListKey] = useState(0);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setFolder(null);
      return;
    }

    const loadFolder = async () => {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      try {
        const res = await api.get(`/question-folders/${id}`);
        setFolder(normalizeFolder(res.data));
      } catch (err: any) {
        setFolder(null);
        setError(err?.response?.data?.error || "Failed to load folder");
      } finally {
        setLoading(false);
      }
    };

    loadFolder();
  }, [id]);

  const handleDeleteAllQuestions = async () => {
    if (!folder || deleting) return;

    setDeleting(true);
    setError(null);
    try {
      const res = await api.delete(`/question-folders/${folder.id}/questions`);
      const archived = Number(res.data?.archived ?? 0);
      setFolder((prev) =>
        prev
          ? {
              ...prev,
              questionCount: Math.max(0, prev.questionCount - archived),
            }
          : prev
      );
      setListKey((prev) => prev + 1);
      setDeleteModalOpen(false);
      setSuccessMessage(
        archived > 0
          ? `${archived} question${archived === 1 ? "" : "s"} deleted from this folder.`
          : "No active questions were found in this folder."
      );
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to delete folder questions");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <QuestionBankLayout
      title={folder?.name ?? "Folder"}
      description={folder?.description || "View and manage questions assigned to this folder."}
      showBack={false}
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate("/question-bank/folders")}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Back to Folders
          </button>
          {folder ? (
            <>
              {permissions.canCreate ? (
                <>
                  <button
                    onClick={() => navigate(`/question-bank/bulk-upload?folderId=${folder.id}`)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Bulk Upload
                  </button>
                  <button
                    onClick={() => navigate(`/question-bank/new?folderId=${folder.id}`)}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Add Question
                  </button>
                </>
              ) : null}
              {permissions.canDelete ? (
                <button
                  onClick={() => setDeleteModalOpen(true)}
                  disabled={folder.questionCount === 0}
                  className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Delete All Questions
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      }
    >
      {successMessage && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading folder...
        </div>
      ) : folder ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Folder Overview
                </p>
                <h2 className="mt-2 text-lg font-semibold text-slate-900">{folder.name}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {folder.description || "No description yet."}
                </p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {folder.questionCount} questions
              </div>
            </div>
          </div>

          <QuestionBankList
            key={`${folder.id}-${listKey}`}
            filtersPlacement="content"
            folderId={folder.id}
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Folder not found.
        </div>
      )}

      {deleteModalOpen && folder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete All Folder Questions</h3>
            <p className="mt-2 text-sm text-slate-600">
              This will delete all {folder.questionCount} question
              {folder.questionCount === 1 ? "" : "s"} currently inside <strong>{folder.name}</strong>.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Deleted questions are archived and removed from the active folder list.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllQuestions}
                disabled={deleting}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </QuestionBankLayout>
  );
}
