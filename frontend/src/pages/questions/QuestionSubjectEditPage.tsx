import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import type { CurriculumItem } from "@/types/questionBank";

export default function QuestionSubjectEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<CurriculumItem | null>(null);
  const [programs, setPrograms] = useState<CurriculumItem[]>([]);
  const [grades, setGrades] = useState<CurriculumItem[]>([]);
  const [programId, setProgramId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadPrograms = async () => {
      try {
        const res = await api.get("/programs");
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        setPrograms(payload);
      } catch {
        setPrograms([]);
      }
    };
    loadPrograms();
  }, []);

  useEffect(() => {
    if (!id) return;
    const loadSubject = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/subjects/${id}`);
        if (res.data) {
          const loaded = {
            id: res.data.id ?? res.data.subject_id ?? id,
            name: res.data.name ?? res.data.title ?? "Untitled",
            code: res.data.code ?? null,
            grade_id: res.data.grade_id ?? null,
            grade_number: res.data.grade_number ?? null,
          };
          setSubject(loaded);
          setName(loaded.name);
          setGradeId(loaded.grade_id ? String(loaded.grade_id) : "");
          if (loaded.grade_id) {
            try {
              const gradeRes = await api.get(`/grades/${loaded.grade_id}`);
              if (gradeRes.data?.program_id) {
                setProgramId(String(gradeRes.data.program_id));
              }
            } catch {
              setProgramId("");
            }
          }
          return;
        }
      } catch {
        setSubject(null);
        setName("");
      } finally {
        setLoading(false);
      }
    };
    loadSubject();
  }, [id]);

  useEffect(() => {
    if (!programId) {
      setGrades([]);
      return;
    }
    const loadGrades = async () => {
      try {
        const res = await api.get(`/programs/${programId}/grades`);
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        setGrades(payload);
      } catch {
        setGrades([]);
      }
    };
    loadGrades();
  }, [programId]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!subject || !gradeId) return;
    setSaving(true);
    try {
      const res = await api.patch(`/subjects/${subject.id}`, { name: name.trim(), grade_id: Number(gradeId) });
      const updated: CurriculumItem = {
        id: subject.id,
        name: res.data?.name ?? name.trim(),
        code: res.data?.code ?? subject.code ?? null,
        grade_id: res.data?.grade_id ?? Number(gradeId),
        grade_number: res.data?.grade_number ?? grades.find((grade) => String(grade.id) === gradeId)?.grade_number ?? null,
      };
      navigate("/question-bank/subjects", { state: { updatedSubject: updated } });
      return;
    } catch {
      alert("Failed to update subject.");
      return;
    } finally {
      setSaving(false);
    }
  };

  return (
    <QuestionBankLayout
      title="Edit Subject"
      description="Update the subject name and metadata."
      actions={
        <button
          onClick={() => navigate("/question-bank/subjects")}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      }
    >
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading subject...
        </div>
      ) : subject ? (
        <form
          onSubmit={handleSave}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <label className="text-xs font-semibold text-slate-500">Program</label>
          <select
            value={programId}
            onChange={(event) => {
              setProgramId(event.target.value);
              setGradeId("");
            }}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          >
            <option value="">Select program</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>

          <label className="mt-4 block text-xs font-semibold text-slate-500">Grade</label>
          <select
            value={gradeId}
            onChange={(event) => setGradeId(event.target.value)}
            disabled={!programId}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="">Select grade</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.name ?? `Grade ${grade.grade_number ?? ""}`.trim()}
              </option>
            ))}
          </select>

          <label className="text-xs font-semibold text-slate-500">Subject Name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={saving}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Subject not found.
        </div>
      )}
    </QuestionBankLayout>
  );
}
