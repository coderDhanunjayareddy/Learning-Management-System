import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import type { CurriculumItem } from "@/types/questionBank";

const generateSubjectCode = (name: string) => {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 12);
  const suffix = Date.now().toString(36).toUpperCase().slice(-4);
  return `${base || "SUBJECT"}_${suffix}`.slice(0, 20);
};

export default function QuestionSubjectCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await api.post("/subjects", {
        name: name.trim(),
        code: generateSubjectCode(name),
      });
      if (res.data) {
        const created: CurriculumItem = {
          id: res.data.id ?? res.data.subject_id ?? Date.now(),
          name: res.data.name ?? name.trim(),
        };
        navigate("/question-bank/subjects", { state: { createdSubject: created } });
        return;
      }
    } catch {
      alert("Failed to create subject.");
      return;
    } finally {
      setLoading(false);
    }
  };

  return (
    <QuestionBankLayout
      title="Add Subject"
      description="Create a new subject to organize questions."
      actions={
        <button
          onClick={() => navigate("/question-bank/subjects")}
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
        <label className="text-xs font-semibold text-slate-500">Subject Name</label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g., Mathematics"
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
        >
          {loading ? "Saving..." : "Save Subject"}
        </button>
      </form>
    </QuestionBankLayout>
  );
}
