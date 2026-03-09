import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import type { CurriculumItem } from "@/types/questionBank";

const normalizeCurriculum = (items: any[]): CurriculumItem[] =>
  items
    .map((item) => ({
      id: item.id ?? item.topic_id ?? item.chapter_id ?? item.subject_id,
      name: item.name ?? item.title ?? "Untitled",
      subject_id: item.subject_id ?? null,
      chapter_id: item.chapter_id ?? null,
    }))
    .filter((item) => item.id !== undefined && item.id !== null);

const parseQuery = (searchParams: URLSearchParams) => ({
  subjectId: searchParams.get("subject_id") ?? "",
  chapterId: searchParams.get("chapter_id") ?? "",
});

export default function QuestionTopicsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = parseQuery(searchParams);

  const [subjects, setSubjects] = useState<CurriculumItem[]>([]);
  const [chapters, setChapters] = useState<CurriculumItem[]>([]);
  const [topics, setTopics] = useState<CurriculumItem[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialQuery.subjectId);
  const [selectedChapterId, setSelectedChapterId] = useState(initialQuery.chapterId);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as
      | { createdTopic?: CurriculumItem; updatedTopic?: CurriculumItem }
      | null;
    if (!state) return;

    if (state.createdTopic && String(state.createdTopic.chapter_id ?? "") === selectedChapterId) {
      setTopics((prev) => [state.createdTopic as CurriculumItem, ...prev]);
    }
    if (state.updatedTopic && String(state.updatedTopic.chapter_id ?? "") === selectedChapterId) {
      setTopics((prev) =>
        prev.map((item) =>
          String(item.id) === String(state.updatedTopic?.id)
            ? (state.updatedTopic as CurriculumItem)
            : item
        )
      );
    }

    navigate(`${location.pathname}${location.search}`, { replace: true });
  }, [location.pathname, location.search, location.state, navigate, selectedChapterId]);

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

        if (!selectedSubjectId && normalized.length > 0) {
          const nextSubject = String(normalized[0].id);
          setSelectedSubjectId(nextSubject);
          setSearchParams({ subject_id: nextSubject });
        }
      } catch (err: any) {
        setSubjects([]);
        setError(err?.response?.data?.error || "Failed to load subjects");
      } finally {
        setLoadingSubjects(false);
      }
    };
    loadSubjects();
  }, [setSearchParams]);

  useEffect(() => {
    if (!selectedSubjectId) {
      setChapters([]);
      setSelectedChapterId("");
      setTopics([]);
      return;
    }

    const loadChapters = async () => {
      setLoadingChapters(true);
      setError(null);
      try {
        const res = await api.get(`/subjects/${selectedSubjectId}/chapters`);
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
        const normalized = normalizeCurriculum(payload);
        setChapters(normalized);

        if (!selectedChapterId && normalized.length > 0) {
          const nextChapter = String(normalized[0].id);
          setSelectedChapterId(nextChapter);
          setSearchParams({ subject_id: selectedSubjectId, chapter_id: nextChapter });
        } else if (selectedChapterId && !normalized.some((item) => String(item.id) === selectedChapterId)) {
          setSelectedChapterId("");
          setSearchParams({ subject_id: selectedSubjectId });
        }
      } catch (err: any) {
        setChapters([]);
        setTopics([]);
        setError(err?.response?.data?.error || "Failed to load chapters");
      } finally {
        setLoadingChapters(false);
      }
    };
    loadChapters();
  }, [selectedSubjectId, setSearchParams]);

  useEffect(() => {
    if (!selectedChapterId) {
      setTopics([]);
      return;
    }

    const loadTopics = async () => {
      setLoadingTopics(true);
      setError(null);
      try {
        const res = await api.get(`/chapters/${selectedChapterId}/topics`);
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
        setTopics(normalizeCurriculum(payload));
      } catch (err: any) {
        setTopics([]);
        setError(err?.response?.data?.error || "Failed to load topics");
      } finally {
        setLoadingTopics(false);
      }
    };
    loadTopics();
  }, [selectedChapterId]);

  const selectedSubjectName = useMemo(
    () => subjects.find((subject) => String(subject.id) === selectedSubjectId)?.name ?? "Selected Subject",
    [selectedSubjectId, subjects]
  );
  const selectedChapterName = useMemo(
    () => chapters.find((chapter) => String(chapter.id) === selectedChapterId)?.name ?? "Selected Chapter",
    [chapters, selectedChapterId]
  );

  return (
    <QuestionBankLayout
      title="Topics"
      description="Manage topics under each chapter."
      actions={
        <button
          onClick={() =>
            navigate(
              `/question-bank/topics/new${selectedChapterId ? `?subject_id=${selectedSubjectId}&chapter_id=${selectedChapterId}` : ""}`
            )
          }
          disabled={!selectedChapterId}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add Topic
        </button>
      }
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-500">Subject</label>
            <select
              value={selectedSubjectId}
              onChange={(event) => {
                const nextSubject = event.target.value;
                setSelectedSubjectId(nextSubject);
                setSelectedChapterId("");
                setTopics([]);
                if (nextSubject) {
                  setSearchParams({ subject_id: nextSubject });
                } else {
                  setSearchParams({});
                }
              }}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
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
              value={selectedChapterId}
              onChange={(event) => {
                const nextChapter = event.target.value;
                setSelectedChapterId(nextChapter);
                if (selectedSubjectId && nextChapter) {
                  setSearchParams({ subject_id: selectedSubjectId, chapter_id: nextChapter });
                } else if (selectedSubjectId) {
                  setSearchParams({ subject_id: selectedSubjectId });
                } else {
                  setSearchParams({});
                }
              }}
              disabled={!selectedSubjectId}
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

        {loadingSubjects || loadingChapters || loadingTopics ? (
          <div className="mt-4 text-sm text-slate-500">Loading topics...</div>
        ) : (
          <div className="mt-4 space-y-3">
            {selectedChapterId ? (
              <>
                {topics.map((topic) => (
                  <div
                    key={topic.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{topic.name}</div>
                      <div className="text-xs text-slate-500">
                        ID: {topic.id} • {selectedSubjectName} / {selectedChapterName}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/question-bank/topics/${topic.id}/edit`)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                  </div>
                ))}
                {topics.length === 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    No topics for this chapter yet.
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Select a chapter to view topics.
              </div>
            )}
          </div>
        )}
      </div>
    </QuestionBankLayout>
  );
}
