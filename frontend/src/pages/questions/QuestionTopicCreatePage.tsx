import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import type { CurriculumItem } from "@/types/questionBank";

const normalizeCurriculum = (items: any[]): CurriculumItem[] =>
  items
    .map((item) => ({
      id: item.id ?? item.chapter_id ?? item.subject_id,
      name: item.name ?? item.title ?? "Untitled",
      subject_id: item.subject_id ?? null,
      chapter_id: item.chapter_id ?? null,
    }))
    .filter((item) => item.id !== undefined && item.id !== null);

export default function QuestionTopicCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [subjects, setSubjects] = useState<CurriculumItem[]>([]);
  const [chapters, setChapters] = useState<CurriculumItem[]>([]);
  const [subjectId, setSubjectId] = useState(searchParams.get("subject_id") ?? "");
  const [chapterId, setChapterId] = useState(searchParams.get("chapter_id") ?? "");
  const [name, setName] = useState("");
  const [topicNumber, setTopicNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
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

  useEffect(() => {
    if (!subjectId) {
      setChapters([]);
      setChapterId("");
      return;
    }

    const loadChapters = async () => {
      setLoadingChapters(true);
      setError(null);
      try {
        const res = await api.get(`/subjects/${subjectId}/chapters`);
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
        const normalized = normalizeCurriculum(payload);
        setChapters(normalized);

        if (!chapterId && normalized.length > 0) {
          setChapterId(String(normalized[0].id));
        } else if (chapterId && !normalized.some((chapter) => String(chapter.id) === chapterId)) {
          setChapterId("");
        }
      } catch (err: any) {
        setChapters([]);
        setChapterId("");
        setError(err?.response?.data?.error || "Failed to load chapters");
      } finally {
        setLoadingChapters(false);
      }
    };
    loadChapters();
  }, [subjectId]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const parsedChapterId = Number(chapterId);
    const parsedTopicNumber = Number(topicNumber);

    if (!Number.isInteger(parsedChapterId) || parsedChapterId <= 0) {
      setError("Chapter is required");
      return;
    }
    if (!trimmedName) {
      setError("Topic name is required");
      return;
    }
    if (!Number.isInteger(parsedTopicNumber) || parsedTopicNumber <= 0) {
      setError("Topic number must be a positive integer");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/chapters/${parsedChapterId}/topics`, {
        name: trimmedName,
        topic_number: parsedTopicNumber,
      });
      const created: CurriculumItem = {
        id: res.data?.id ?? res.data?.topic_id,
        name: res.data?.name ?? trimmedName,
        chapter_id: res.data?.chapter_id ?? parsedChapterId,
      };
      navigate(
        `/question-bank/topics?subject_id=${subjectId}&chapter_id=${parsedChapterId}`,
        { state: { createdTopic: created } }
      );
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to create topic");
    } finally {
      setLoading(false);
    }
  };

  return (
    <QuestionBankLayout
      title="Add Topic"
      description="Create a topic under a chapter."
      actions={
        <button
          onClick={() =>
            navigate(
              `/question-bank/topics${chapterId ? `?subject_id=${subjectId}&chapter_id=${chapterId}` : ""}`
            )
          }
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

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-500">Subject</label>
            <select
              value={subjectId}
              onChange={(event) => {
                setSubjectId(event.target.value);
                setChapterId("");
              }}
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
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500">Chapter</label>
            <select
              value={chapterId}
              onChange={(event) => setChapterId(event.target.value)}
              disabled={!subjectId || loadingChapters}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-100"
            >
              <option value="">Select chapter</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={String(chapter.id)}>
                  {chapter.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="mt-4 block text-xs font-semibold text-slate-500">Topic Name</label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g., Linear Equations"
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        />

        <label className="mt-4 block text-xs font-semibold text-slate-500">Topic Number</label>
        <input
          value={topicNumber}
          onChange={(event) => setTopicNumber(event.target.value)}
          placeholder="e.g., 1"
          inputMode="numeric"
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        />

        <button
          type="submit"
          disabled={loading || loadingSubjects || loadingChapters}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
        >
          {loading ? "Saving..." : "Save Topic"}
        </button>
      </form>
    </QuestionBankLayout>
  );
}
