import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import type { CurriculumItem } from "@/types/questionBank";

export default function QuestionSubjectEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<CurriculumItem | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
          };
          setSubject(loaded);
          setName(loaded.name);
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

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!subject) return;
    setSaving(true);
    try {
      const res = await api.patch(`/subjects/${subject.id}`, { name: name.trim() });
      const updated: CurriculumItem = {
        id: subject.id,
        name: res.data?.name ?? name.trim(),
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
