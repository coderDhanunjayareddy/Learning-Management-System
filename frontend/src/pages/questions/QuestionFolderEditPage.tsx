import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import type { QuestionFolder } from "@/types/questionFolder";

const normalizeFolder = (item: any): QuestionFolder => ({
  id: item.id,
  name: item.name ?? "Untitled Folder",
  description: item.description ?? "",
  questionCount: Number(item.questionCount ?? item.question_count ?? 0),
});

export default function QuestionFolderEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [folder, setFolder] = useState<QuestionFolder | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFolder = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/question-folders/${id}`);
        const normalized = normalizeFolder(res.data);
        setFolder(normalized);
        setName(normalized.name);
        setDescription(normalized.description ?? "");
      } catch (err: any) {
        setFolder(null);
        setError(err?.response?.data?.error || "Failed to load folder");
      } finally {
        setLoading(false);
      }
    };

    loadFolder();
  }, [id]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!folder) return;
    if (!name.trim()) {
      setError("Folder name is required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.patch(`/question-folders/${id}`, {
        name: name.trim(),
        description: description.trim() || null,
      });
      navigate("/question-bank/folders");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to update folder");
    } finally {
      setSaving(false);
    }
  };

  return (
    <QuestionBankLayout
      title="Edit Folder"
      description="Update the folder details."
      actions={
        <button
          onClick={() => navigate("/question-bank/folders")}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
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
          Loading folder...
        </div>
      ) : folder ? (
        <form
          onSubmit={handleSave}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <label className="text-xs font-semibold text-slate-500">Folder Name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
          <label className="mt-4 block text-xs font-semibold text-slate-500">Description</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={saving}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Folder not found.
        </div>
      )}
    </QuestionBankLayout>
  );
}
