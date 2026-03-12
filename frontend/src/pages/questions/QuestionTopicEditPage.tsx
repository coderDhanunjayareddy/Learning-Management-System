import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import type { CurriculumItem } from "@/types/questionBank";

type TopicPayload = CurriculumItem & {
  topic_number?: number | null;
  chapter_id?: string | number | null;
  subject_id?: string | number | null;
};

const buildHierarchyQuery = (
  programId: string,
  gradeId: string,
  subjectId: string,
  chapterId: string
) => {
  const params = new URLSearchParams();
  if (programId) params.set("program_id", programId);
  if (gradeId) params.set("grade_id", gradeId);
  if (subjectId) params.set("subject_id", subjectId);
  if (chapterId) params.set("chapter_id", chapterId);
  const query = params.toString();
  return query ? `?${query}` : "";
};

export default function QuestionTopicEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [programId, setProgramId] = useState(searchParams.get("program_id") ?? "");
  const [gradeId, setGradeId] = useState(searchParams.get("grade_id") ?? "");

  const [topic, setTopic] = useState<TopicPayload | null>(null);
  const [name, setName] = useState("");
  const [topicNumber, setTopicNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjectId = topic?.subject_id ? String(topic.subject_id) : searchParams.get("subject_id") ?? "";
  const chapterId = topic?.chapter_id ? String(topic.chapter_id) : searchParams.get("chapter_id") ?? "";
  const returnQuery = useMemo(
    () => buildHierarchyQuery(programId, gradeId, subjectId, chapterId),
    [programId, gradeId, subjectId, chapterId]
  );

  useEffect(() => {
    if (!id) return;

    const loadTopic = async () => {
      setLoading(true);
      setError(null);
      try {
        const topicRes = await api.get(`/topics/${id}`);
        if (!topicRes.data) {
          setTopic(null);
          return;
        }

        let resolvedSubjectId: number | null = null;
        if (topicRes.data.chapter_id) {
          try {
            const chapterRes = await api.get(`/chapters/${topicRes.data.chapter_id}`);
            resolvedSubjectId = chapterRes.data?.subject_id ?? null;
          } catch {
            resolvedSubjectId = null;
          }
        }

        const loaded: TopicPayload = {
          id: topicRes.data.id ?? id,
          name: topicRes.data.name ?? "Untitled",
          chapter_id: topicRes.data.chapter_id ?? null,
          topic_number: topicRes.data.topic_number ?? null,
          subject_id: resolvedSubjectId,
        };

        if (resolvedSubjectId && (!gradeId || !programId)) {
          try {
            const subjectRes = await api.get(`/subjects/${resolvedSubjectId}`);
            const resolvedGradeId = String(subjectRes.data?.grade_id ?? "");
            if (resolvedGradeId) {
              setGradeId((prev) => prev || resolvedGradeId);
              if (!programId) {
                try {
                  const gradeRes = await api.get(`/grades/${resolvedGradeId}`);
                  const resolvedProgramId = String(gradeRes.data?.program_id ?? "");
                  if (resolvedProgramId) {
                    setProgramId((prev) => prev || resolvedProgramId);
                  }
                } catch {
                  // Keep query-derived value if available.
                }
              }
            }
          } catch {
            // Keep query-derived values if lookup fails.
          }
        }

        setTopic(loaded);
        setName(loaded.name);
        setTopicNumber(loaded.topic_number ? String(loaded.topic_number) : "");
      } catch (err: any) {
        setTopic(null);
        setError(err?.response?.data?.error || "Failed to load topic");
      } finally {
        setLoading(false);
      }
    };

    loadTopic();
  }, [id]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!topic) return;

    const trimmedName = name.trim();
    const parsedTopicNumber = Number(topicNumber);
    if (!trimmedName) {
      setError("Topic name is required");
      return;
    }
    if (!Number.isInteger(parsedTopicNumber) || parsedTopicNumber <= 0) {
      setError("Topic number must be a positive integer");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await api.patch(`/topics/${topic.id}`, {
        name: trimmedName,
        topic_number: parsedTopicNumber,
      });
      const updated: CurriculumItem = {
        id: topic.id,
        name: res.data?.name ?? trimmedName,
        chapter_id: topic.chapter_id ?? null,
      };
      navigate(`/question-bank/topics${returnQuery}`, {
        state: { updatedTopic: updated },
      });
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to update topic");
    } finally {
      setSaving(false);
    }
  };

  return (
    <QuestionBankLayout
      title="Edit Topic"
      description="Update topic details."
      actions={
        <button
          onClick={() => navigate(`/question-bank/topics${returnQuery}`)}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      }
    >
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading topic...
        </div>
      ) : topic ? (
        <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <label className="text-xs font-semibold text-slate-500">Topic Name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />

          <label className="mt-4 block text-xs font-semibold text-slate-500">Topic Number</label>
          <input
            value={topicNumber}
            onChange={(event) => setTopicNumber(event.target.value)}
            inputMode="numeric"
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
          Topic not found.
        </div>
      )}
    </QuestionBankLayout>
  );
}
