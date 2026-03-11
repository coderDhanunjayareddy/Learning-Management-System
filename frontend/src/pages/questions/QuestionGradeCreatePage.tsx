import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import type { CurriculumItem } from "@/types/questionBank";

const normalizePrograms = (items: any[]): CurriculumItem[] =>
  items
    .map((item) => ({
      id: item.id,
      name: item.name ?? "Untitled",
    }))
    .filter((item) => item.id !== undefined && item.id !== null);

export default function QuestionGradeCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [programs, setPrograms] = useState<CurriculumItem[]>([]);
  const [programId, setProgramId] = useState("");
  const [gradeNumber, setGradeNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const programFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("program_id") ?? "";
  }, [location.search]);

  useEffect(() => {
    const loadPrograms = async () => {
      try {
        const res = await api.get("/programs");
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        const normalized = normalizePrograms(payload);
        setPrograms(normalized);
        if (programFromQuery) {
          setProgramId(programFromQuery);
        } else if (normalized.length > 0) {
          setProgramId(String(normalized[0].id));
        }
      } catch {
        setPrograms([]);
      }
    };
    loadPrograms();
  }, [programFromQuery]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedGrade = Number(gradeNumber);
    if (!programId || !Number.isInteger(parsedGrade) || parsedGrade <= 0) return;

    setLoading(true);
    try {
      await api.post(`/programs/${programId}/grades`, { grade_number: parsedGrade });
      navigate(`/question-bank/grades?program_id=${programId}`);
      return;
    } catch {
      alert("Failed to create grade.");
      return;
    } finally {
      setLoading(false);
    }
  };

  return (
    <QuestionBankLayout
      title="Add Grade"
      description="Create a grade under the selected program."
      actions={
        <button
          onClick={() => navigate(`/question-bank/grades${programId ? `?program_id=${programId}` : ""}`)}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      }
    >
      <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="text-xs font-semibold text-slate-500">Program</label>
        <select
          value={programId}
          onChange={(event) => setProgramId(event.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        >
          <option value="">Select program</option>
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.name}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-xs font-semibold text-slate-500">Grade Number</label>
        <input
          type="number"
          value={gradeNumber}
          onChange={(event) => setGradeNumber(event.target.value)}
          placeholder="e.g., 6"
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        />

        <button
          type="submit"
          disabled={loading}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
        >
          {loading ? "Saving..." : "Save Grade"}
        </button>
      </form>
    </QuestionBankLayout>
  );
}

