import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import { mockFolders, type QuestionFolder } from "@/features/question-bank/data/mockFolders";

export default function QuestionFolderEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [folder, setFolder] = useState<QuestionFolder | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!id) return;
    const match = mockFolders.find((item) => item.id === id) ?? null;
    setFolder(match);
    setName(match?.name ?? "");
    setDescription(match?.description ?? "");
  }, [id]);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!folder) return;
    const updated: QuestionFolder = {
      ...folder,
      name: name.trim(),
      description: description.trim(),
    };
    navigate("/question-bank/folders", { state: { updatedFolder: updated } });
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
      {folder ? (
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
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Save Changes
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
