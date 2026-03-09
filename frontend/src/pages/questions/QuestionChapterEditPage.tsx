import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import type { CurriculumItem } from "@/types/questionBank";

type ChapterPayload = CurriculumItem & {
  chapter_number?: number | null;
  description?: string | null;
};

export default function QuestionChapterEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState<ChapterPayload | null>(null);
  const [name, setName] = useState("");
  const [chapterNumber, setChapterNumber] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const loadChapter = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/chapters/${id}`);
        if (!res.data) {
          setChapter(null);
          return;
        }
        const loaded: ChapterPayload = {
          id: res.data.id ?? id,
          name: res.data.name ?? "Untitled",
          subject_id: res.data.subject_id ?? null,
          chapter_number: res.data.chapter_number ?? null,
          description: res.data.description ?? null,
        };
        setChapter(loaded);
        setName(loaded.name);
        setChapterNumber(loaded.chapter_number ? String(loaded.chapter_number) : "");
        setDescription(loaded.description ?? "");
      } catch (err: any) {
        setChapter(null);
        setError(err?.response?.data?.error || "Failed to load chapter");
      } finally {
        setLoading(false);
      }
    };
    loadChapter();
  }, [id]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!chapter) return;
    const trimmedName = name.trim();
    const parsedChapterNumber = Number(chapterNumber);
    if (!trimmedName) {
      setError("Chapter name is required");
      return;
    }
    if (!Number.isInteger(parsedChapterNumber) || parsedChapterNumber <= 0) {
      setError("Chapter number must be a positive integer");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await api.patch(`/chapters/${chapter.id}`, {
        name: trimmedName,
        chapter_number: parsedChapterNumber,
        description: description.trim() || null,
      });

      const updated: CurriculumItem = {
        id: chapter.id,
        name: res.data?.name ?? trimmedName,
        subject_id: chapter.subject_id ?? null,
      };
      const query = chapter.subject_id ? `?subject_id=${chapter.subject_id}` : "";
      navigate(`/question-bank/chapters${query}`, {
        state: { updatedChapter: updated },
      });
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to update chapter");
    } finally {
      setSaving(false);
    }
  };

  return (
    <QuestionBankLayout
      title="Edit Chapter"
      description="Update chapter details."
      actions={
        <button
          onClick={() =>
            navigate(
              `/question-bank/chapters${chapter?.subject_id ? `?subject_id=${chapter.subject_id}` : ""}`
            )
          }
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      }
    >
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading chapter...
        </div>
      ) : chapter ? (
        <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <label className="text-xs font-semibold text-slate-500">Chapter Name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />

          <label className="mt-4 block text-xs font-semibold text-slate-500">Chapter Number</label>
          <input
            value={chapterNumber}
            onChange={(event) => setChapterNumber(event.target.value)}
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
            disabled={saving}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Chapter not found.
        </div>
      )}
    </QuestionBankLayout>
  );
}
