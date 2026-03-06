import { useState } from "react";
import { useNavigate } from "react-router-dom";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import type { QuestionFolder } from "@/features/question-bank/data/mockFolders";

export default function QuestionFolderCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    const created: QuestionFolder = {
      id: `${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      questionCount: 0,
    };

    navigate("/question-bank/folders", { state: { createdFolder: created } });
  };

  return (
    <QuestionBankLayout
      title="Create Folder"
      description="Organize questions into folders."
      actions={
        <button
          onClick={() => navigate("/question-bank/folders")}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      }
    >
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <label className="text-xs font-semibold text-slate-500">Folder Name</label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g., Algebra Revision"
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
          Save Folder
        </button>
      </form>
    </QuestionBankLayout>
  );
}
