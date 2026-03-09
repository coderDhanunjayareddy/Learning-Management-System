import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import type { CurriculumItem } from "@/types/questionBank";

const normalizeCurriculum = (items: any[]): CurriculumItem[] =>
  items
    .map((item) => ({
      id: item.id ?? item.subject_id,
      name: item.name ?? item.title ?? "Untitled",
      subject_id: item.subject_id ?? null,
      chapter_id: item.chapter_id ?? null,
    }))
    .filter((item) => item.id !== undefined && item.id !== null);

export default function QuestionChapterCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [subjects, setSubjects] = useState<CurriculumItem[]>([]);
  const [subjectId, setSubjectId] = useState(searchParams.get("subject_id") ?? "");
  const [name, setName] = useState("");
  const [chapterNumber, setChapterNumber] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSubjects = async () => {
      setLoadingSubjects(true);
      setError(null);
      try {
        const res = await api.get("/subjects");
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
        const normalized = normalizeCurriculum(payload);
        setSubjects(normalized);
        if (!subjectId && normalized.length > 0) {
          setSubjectId(String(normalized[0].id));
        }
      } catch (err: any) {
        setSubjects([]);
        setError(err?.response?.data?.error || "Failed to load subjects");
      } finally {
        setLoadingSubjects(false);
      }
    };
    loadSubjects();
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const parsedSubjectId = Number(subjectId);
    const parsedChapterNumber = Number(chapterNumber);

    if (!parsedSubjectId) {
      setError("Subject is required");
      return;
    }
    if (!trimmedName) {
      setError("Chapter name is required");
      return;
    }
    if (!Number.isInteger(parsedChapterNumber) || parsedChapterNumber <= 0) {
      setError("Chapter number must be a positive integer");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/subjects/${parsedSubjectId}/chapters`, {
        name: trimmedName,
        chapter_number: parsedChapterNumber,
        description: description.trim() || null,
      });
      const created: CurriculumItem = {
        id: res.data?.id ?? res.data?.chapter_id,
        name: res.data?.name ?? trimmedName,
        subject_id: res.data?.subject_id ?? parsedSubjectId,
      };
      navigate(`/question-bank/chapters?subject_id=${parsedSubjectId}`, {
        state: { createdChapter: created },
      });
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to create chapter");
    } finally {
      setLoading(false);
    }
  };

  return (
    <QuestionBankLayout
      title="Add Chapter"
      description="Create a chapter under a subject."
      actions={
        <button
          onClick={() => navigate(`/question-bank/chapters${subjectId ? `?subject_id=${subjectId}` : ""}`)}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      }
    >
      <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <label className="text-xs font-semibold text-slate-500">Subject</label>
        <select
          value={subjectId}
          onChange={(event) => setSubjectId(event.target.value)}
          disabled={loadingSubjects}
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-100"
        >
          <option value="">Select subject</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={String(subject.id)}>
              {subject.name}
            </option>
          ))}
        </select>

        <label className="mt-4 block text-xs font-semibold text-slate-500">Chapter Name</label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g., Algebra"
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        />

        <label className="mt-4 block text-xs font-semibold text-slate-500">Chapter Number</label>
        <input
          value={chapterNumber}
          onChange={(event) => setChapterNumber(event.target.value)}
          placeholder="e.g., 1"
          inputMode="numeric"
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        />

        <label className="mt-4 block text-xs font-semibold text-slate-500">Description (Optional)</label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        />

        <button
          type="submit"
          disabled={loading || loadingSubjects}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
        >
          {loading ? "Saving..." : "Save Chapter"}
        </button>
      </form>
    </QuestionBankLayout>
  );
}
