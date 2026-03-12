import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import type { CurriculumItem } from "@/types/questionBank";

const generateProgramCode = (name: string) => {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);
  return base || "PROGRAM";
};

export default function QuestionProgramCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        code: code.trim() || generateProgramCode(name),
      };
      const res = await api.post("/programs", payload);
      if (res.data) {
        const created: CurriculumItem = {
          id: res.data.id ?? Date.now(),
          name: res.data.name ?? payload.name,
          code: res.data.code ?? payload.code,
        };
        navigate("/question-bank/programs", { state: { createdProgram: created } });
        return;
      }
    } catch {
      alert("Failed to create program.");
      return;
    } finally {
      setLoading(false);
    }
  };

  return (
    <QuestionBankLayout
      title="Add Program"
      description="Create a new program in the question curriculum."
      actions={
        <button
          onClick={() => navigate("/question-bank/programs")}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      }
    >
      <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="text-xs font-semibold text-slate-500">Program Name</label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g., Catalyst"
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        />

        <label className="mt-4 block text-xs font-semibold text-slate-500">Program Code</label>
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Auto-generated if blank"
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        />

        <button
          type="submit"
          disabled={loading}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
        >
          {loading ? "Saving..." : "Save Program"}
        </button>
      </form>
    </QuestionBankLayout>
  );
}

