import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
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

export default function QuestionChaptersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSubjectId = searchParams.get("subject_id") ?? "";
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId);
  const [subjects, setSubjects] = useState<CurriculumItem[]>([]);
  const [chapters, setChapters] = useState<CurriculumItem[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as
      | { createdChapter?: CurriculumItem; updatedChapter?: CurriculumItem }
      | null;
    if (!state) return;

    if (state.createdChapter && String(state.createdChapter.subject_id ?? "") === selectedSubjectId) {
      setChapters((prev) => [state.createdChapter as CurriculumItem, ...prev]);
    }
    if (state.updatedChapter && String(state.updatedChapter.subject_id ?? "") === selectedSubjectId) {
      setChapters((prev) =>
        prev.map((item) =>
          String(item.id) === String(state.updatedChapter?.id)
            ? (state.updatedChapter as CurriculumItem)
            : item
        )
      );
    }
    navigate(`${location.pathname}${location.search}`, { replace: true });
  }, [location.pathname, location.search, location.state, navigate, selectedSubjectId]);

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
          const next = String(normalized[0].id);
          setSelectedSubjectId(next);
          setSearchParams({ subject_id: next });
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
        setChapters(normalizeCurriculum(payload));
      } catch (err: any) {
        setChapters([]);
        setError(err?.response?.data?.error || "Failed to load chapters");
      } finally {
        setLoadingChapters(false);
      }
    };
    loadChapters();
  }, [selectedSubjectId]);

  const selectedSubjectName = useMemo(
    () => subjects.find((subject) => String(subject.id) === selectedSubjectId)?.name ?? "Selected Subject",
    [selectedSubjectId, subjects]
  );

  return (
    <QuestionBankLayout
      title="Chapters"
      description="Manage chapters under each subject."
      actions={
        <button
          onClick={() => navigate(`/question-bank/chapters/new?subject_id=${selectedSubjectId}`)}
          disabled={!selectedSubjectId}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add Chapter
        </button>
      }
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <label className="text-xs font-semibold text-slate-500">Subject</label>
        <select
          value={selectedSubjectId}
          onChange={(event) => {
            const next = event.target.value;
            setSelectedSubjectId(next);
            if (next) {
              setSearchParams({ subject_id: next });
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

        {loadingSubjects || loadingChapters ? (
          <div className="mt-4 text-sm text-slate-500">Loading chapters...</div>
        ) : (
          <div className="mt-4 space-y-3">
            {selectedSubjectId ? (
              <>
                {chapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{chapter.name}</div>
                      <div className="text-xs text-slate-500">
                        ID: {chapter.id} • Subject: {selectedSubjectName}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/question-bank/chapters/${chapter.id}/edit`)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                  </div>
                ))}
                {chapters.length === 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    No chapters for this subject yet.
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Select a subject to view chapters.
              </div>
            )}
          </div>
        )}
      </div>
    </QuestionBankLayout>
  );
}
