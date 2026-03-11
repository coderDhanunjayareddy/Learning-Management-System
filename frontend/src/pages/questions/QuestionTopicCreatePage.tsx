import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import type { CurriculumItem } from "@/types/questionBank";

const toArray = (payload: any): any[] =>
  Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];

const normalizeCurriculum = (items: any[]): CurriculumItem[] =>
  items
    .map((item) => ({
      id: item.id ?? item.program_id ?? item.grade_id ?? item.subject_id ?? item.chapter_id ?? item.topic_id,
      name:
        item.name ??
        item.title ??
        (item.grade_number !== undefined && item.grade_number !== null
          ? `Grade ${item.grade_number}`
          : "Untitled"),
      program_id: item.program_id ?? null,
      grade_id: item.grade_id ?? null,
      grade_number: item.grade_number ?? null,
      subject_id: item.subject_id ?? null,
      chapter_id: item.chapter_id ?? null,
    }))
    .filter((item) => item.id !== undefined && item.id !== null);

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

export default function QuestionTopicCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [programs, setPrograms] = useState<CurriculumItem[]>([]);
  const [grades, setGrades] = useState<CurriculumItem[]>([]);
  const [subjects, setSubjects] = useState<CurriculumItem[]>([]);
  const [chapters, setChapters] = useState<CurriculumItem[]>([]);

  const [programId, setProgramId] = useState(searchParams.get("program_id") ?? "");
  const [gradeId, setGradeId] = useState(searchParams.get("grade_id") ?? "");
  const [subjectId, setSubjectId] = useState(searchParams.get("subject_id") ?? "");
  const [chapterId, setChapterId] = useState(searchParams.get("chapter_id") ?? "");

  const [name, setName] = useState("");
  const [topicNumber, setTopicNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelQuery = useMemo(
    () => buildHierarchyQuery(programId, gradeId, subjectId, chapterId),
    [programId, gradeId, subjectId, chapterId]
  );

  useEffect(() => {
    const loadPrograms = async () => {
      setLoadingPrograms(true);
      setError(null);
      try {
        const res = await api.get("/programs");
        const normalized = normalizeCurriculum(toArray(res.data));
        setPrograms(normalized);

        if (programId && !normalized.some((item) => String(item.id) === programId)) {
          setProgramId("");
          setGradeId("");
          setSubjectId("");
          setChapterId("");
        }
      } catch (err: any) {
        setPrograms([]);
        setError(err?.response?.data?.error || "Failed to load programs");
      } finally {
        setLoadingPrograms(false);
      }
    };
    loadPrograms();
  }, []);

  useEffect(() => {
    if (!programId) {
      setGrades([]);
      setGradeId("");
      setSubjects([]);
      setSubjectId("");
      setChapters([]);
      setChapterId("");
      return;
    }

    const loadGrades = async () => {
      setLoadingGrades(true);
      setError(null);
      try {
        const res = await api.get(`/programs/${programId}/grades`);
        const normalized = normalizeCurriculum(toArray(res.data));
        setGrades(normalized);

        if (gradeId && !normalized.some((item) => String(item.id) === gradeId)) {
          setGradeId("");
          setSubjects([]);
          setSubjectId("");
          setChapters([]);
          setChapterId("");
        }
      } catch (err: any) {
        setGrades([]);
        setGradeId("");
        setSubjects([]);
        setSubjectId("");
        setChapters([]);
        setChapterId("");
        setError(err?.response?.data?.error || "Failed to load grades");
      } finally {
        setLoadingGrades(false);
      }
    };
    loadGrades();
  }, [programId]);

  useEffect(() => {
    if (!gradeId) {
      setSubjects([]);
      setSubjectId("");
      setChapters([]);
      setChapterId("");
      return;
    }

    const loadSubjects = async () => {
      setLoadingSubjects(true);
      setError(null);
      try {
        const res = await api.get(`/grades/${gradeId}/subjects`);
        const normalized = normalizeCurriculum(toArray(res.data));
        setSubjects(normalized);

        if (subjectId && !normalized.some((item) => String(item.id) === subjectId)) {
          setSubjectId("");
          setChapters([]);
          setChapterId("");
        }
      } catch (err: any) {
        setSubjects([]);
        setSubjectId("");
        setChapters([]);
        setChapterId("");
        setError(err?.response?.data?.error || "Failed to load subjects");
      } finally {
        setLoadingSubjects(false);
      }
    };
    loadSubjects();
  }, [gradeId]);

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
        const normalized = normalizeCurriculum(toArray(res.data));
        setChapters(normalized);

        if (chapterId && !normalized.some((item) => String(item.id) === chapterId)) {
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
      navigate(`/question-bank/topics${buildHierarchyQuery(programId, gradeId, subjectId, chapterId)}`, {
        state: { createdTopic: created },
      });
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
          onClick={() => navigate(`/question-bank/topics${cancelQuery}`)}
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
            <label className="text-xs font-semibold text-slate-500">Program</label>
            <select
              value={programId}
              onChange={(event) => {
                setProgramId(event.target.value);
                setGradeId("");
                setSubjectId("");
                setChapterId("");
              }}
              disabled={loadingPrograms}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-100"
            >
              <option value="">Select program</option>
              {programs.map((program) => (
                <option key={program.id} value={String(program.id)}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500">Grade</label>
            <select
              value={gradeId}
              onChange={(event) => {
                setGradeId(event.target.value);
                setSubjectId("");
                setChapterId("");
              }}
              disabled={!programId || loadingGrades}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-100"
            >
              <option value="">Select grade</option>
              {grades.map((grade) => (
                <option key={grade.id} value={String(grade.id)}>
                  {grade.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500">Subject</label>
            <select
              value={subjectId}
              onChange={(event) => {
                setSubjectId(event.target.value);
                setChapterId("");
              }}
              disabled={!gradeId || loadingSubjects}
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
          disabled={loading || loadingPrograms || loadingGrades || loadingSubjects || loadingChapters}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70"
        >
          {loading ? "Saving..." : "Save Topic"}
        </button>
      </form>
    </QuestionBankLayout>
  );
}
