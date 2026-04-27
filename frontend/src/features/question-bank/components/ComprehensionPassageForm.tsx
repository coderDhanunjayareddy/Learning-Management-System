import { useEffect, useMemo, useState } from "react";
import { formatSubjectDisplay, type ComprehensionPassage, type CurriculumItem, type RichTextValue } from "@/types/questionBank";
import RichTextEditor from "@/components/ui/RichTextEditor";
import api from "@/lib/api";

interface ComprehensionPassageFormProps {
  initialPassage?: ComprehensionPassage | null;
  programs: CurriculumItem[];
  grades: CurriculumItem[];
  subjects: CurriculumItem[];
  chapters: CurriculumItem[];
  topics: CurriculumItem[];
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}

const emptyRichText = (): RichTextValue => ({ html: "", json: null });

const normalizeRichText = (value: unknown): RichTextValue => {
  if (!value) return emptyRichText();
  if (typeof value === "string") return { html: value, json: null };
  if (typeof value === "object" && value && "html" in value) {
    return {
      html: String((value as { html?: string }).html ?? ""),
      json: (value as { json?: unknown }).json ?? null,
    };
  }
  return { html: String(value), json: null };
};

const stripHtml = (value: RichTextValue) => value.html.replace(/<[^>]*>/g, "").trim();

const normalizeCurriculum = (items: any[]): CurriculumItem[] =>
  items
    .map((item) => ({
      id: item.id ?? item.program_id ?? item.grade_id ?? item.subject_id ?? item.chapter_id ?? item.topic_id,
      name:
        item.name ??
        (item.grade_number !== undefined && item.grade_number !== null
          ? `Grade ${item.grade_number}`
          : null) ??
        item.title ??
        item.subject_name ??
        "Untitled",
      program_id: item.program_id ?? item.programId ?? null,
      grade_id: item.grade_id ?? item.gradeId ?? null,
      grade_number: item.grade_number ?? item.gradeNumber ?? null,
      subject_id: item.subject_id ?? item.subjectId ?? null,
      chapter_id: item.chapter_id ?? item.chapterId ?? null,
    }))
    .filter((item) => item.id !== undefined && item.id !== null);

const toNullableNumber = (value: string) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function ComprehensionPassageForm({
  initialPassage,
  programs,
  grades,
  subjects,
  chapters,
  topics,
  onClose,
  onSave,
}: ComprehensionPassageFormProps) {
  const [title, setTitle] = useState<RichTextValue>(emptyRichText());
  const [passageContent, setPassageContent] = useState<RichTextValue>(emptyRichText());
  const [programId, setProgramId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [dynamicGrades, setDynamicGrades] = useState<CurriculumItem[]>([]);
  const [dynamicSubjects, setDynamicSubjects] = useState<CurriculumItem[]>([]);
  const [dynamicChapters, setDynamicChapters] = useState<CurriculumItem[]>([]);
  const [dynamicTopics, setDynamicTopics] = useState<CurriculumItem[]>([]);
  const [saving, setSaving] = useState(false);

  const availableGrades = useMemo(() => {
    const source = programId ? dynamicGrades : grades;
    return source.filter((item) => !programId || String(item.program_id) === programId);
  }, [dynamicGrades, grades, programId]);

  const availableSubjects = useMemo(() => {
    const source = gradeId ? dynamicSubjects : subjects;
    return source.filter((item) => !gradeId || String(item.grade_id) === gradeId);
  }, [dynamicSubjects, gradeId, subjects]);

  const availableChapters = useMemo(() => {
    const source = subjectId ? dynamicChapters : chapters;
    return source.filter((item) => !subjectId || String(item.subject_id) === subjectId);
  }, [chapters, dynamicChapters, subjectId]);

  const availableTopics = useMemo(() => {
    const source = chapterId ? dynamicTopics : topics;
    return source.filter((item) => !chapterId || String(item.chapter_id) === chapterId);
  }, [chapterId, dynamicTopics, topics]);

  useEffect(() => {
    if (!initialPassage) {
      setTitle(emptyRichText());
      setPassageContent(emptyRichText());
      setProgramId("");
      setGradeId("");
      setSubjectId("");
      setChapterId("");
      setTopicId("");
      return;
    }

    setTitle(normalizeRichText(initialPassage.title));
    setPassageContent(normalizeRichText(initialPassage.passage_content));
    setProgramId(initialPassage.program_id ? String(initialPassage.program_id) : "");
    setGradeId(initialPassage.grade_id ? String(initialPassage.grade_id) : "");
    setSubjectId(initialPassage.subject_id ? String(initialPassage.subject_id) : "");
    setChapterId(initialPassage.chapter_id ? String(initialPassage.chapter_id) : "");
    setTopicId(initialPassage.topic_id ? String(initialPassage.topic_id) : "");
  }, [initialPassage]);

  useEffect(() => {
    let isMounted = true;
    const loadGrades = async () => {
      if (!programId) {
        if (isMounted) {
          setDynamicGrades([]);
          setDynamicSubjects([]);
          setDynamicChapters([]);
          setDynamicTopics([]);
        }
        return;
      }
      try {
        const res = await api.get(`/programs/${programId}/grades`);
        const payload = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
        if (!isMounted) return;
        setDynamicGrades(normalizeCurriculum(payload));
      } catch {
        if (isMounted) setDynamicGrades([]);
      }
    };

    loadGrades();
    return () => {
      isMounted = false;
    };
  }, [programId]);

  useEffect(() => {
    let isMounted = true;
    const loadSubjects = async () => {
      if (!gradeId) {
        if (isMounted) {
          setDynamicSubjects([]);
          setDynamicChapters([]);
          setDynamicTopics([]);
        }
        return;
      }
      try {
        const res = await api.get(`/grades/${gradeId}/subjects`);
        const payload = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
        if (!isMounted) return;
        setDynamicSubjects(normalizeCurriculum(payload));
      } catch {
        if (isMounted) setDynamicSubjects([]);
      }
    };

    loadSubjects();
    return () => {
      isMounted = false;
    };
  }, [gradeId]);

  useEffect(() => {
    let isMounted = true;
    const loadChapters = async () => {
      if (!subjectId) {
        if (isMounted) {
          setDynamicChapters([]);
          setDynamicTopics([]);
        }
        return;
      }
      try {
        const res = await api.get(`/subjects/${subjectId}/chapters`);
        const payload = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
        if (!isMounted) return;
        setDynamicChapters(normalizeCurriculum(payload));
      } catch {
        if (isMounted) setDynamicChapters([]);
      }
    };

    loadChapters();
    return () => {
      isMounted = false;
    };
  }, [subjectId]);

  useEffect(() => {
    let isMounted = true;
    const loadTopics = async () => {
      if (!chapterId) {
        if (isMounted) setDynamicTopics([]);
        return;
      }
      try {
        const res = await api.get(`/chapters/${chapterId}/topics`);
        const payload = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
        if (!isMounted) return;
        setDynamicTopics(normalizeCurriculum(payload));
      } catch {
        if (isMounted) setDynamicTopics([]);
      }
    };

    loadTopics();
    return () => {
      isMounted = false;
    };
  }, [chapterId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripHtml(title)) {
      alert("Title is required.");
      return;
    }
    if (!stripHtml(passageContent)) {
      alert("Passage content is required.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title,
        passage_content: passageContent,
        program_id: toNullableNumber(programId),
        grade_id: toNullableNumber(gradeId),
        subject_id: toNullableNumber(subjectId),
        chapter_id: toNullableNumber(chapterId),
        topic_id: toNullableNumber(topicId),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{initialPassage ? "Edit Passage" : "Create Passage"}</h2>
        <p className="text-xs text-slate-500">Store passage content once and link normal questions to it.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500">Title</label>
          <div className="mt-2">
            <RichTextEditor value={title} onChange={setTitle} placeholder="Passage title" height={120} />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500">Passage Content</label>
          <div className="mt-2">
            <RichTextEditor value={passageContent} onChange={setPassageContent} placeholder="Enter the passage" height={240} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <div>
            <label className="text-xs font-semibold text-slate-500">Program</label>
            <select
              value={programId}
              onChange={(event) => {
                setProgramId(event.target.value);
                setGradeId("");
                setSubjectId("");
                setChapterId("");
                setTopicId("");
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            >
              <option value="">Select</option>
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
                setTopicId("");
              }}
              disabled={!programId}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">Select</option>
              {availableGrades.map((grade) => (
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
                setTopicId("");
              }}
              disabled={!gradeId}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">Select</option>
              {availableSubjects.map((subject) => (
                <option key={subject.id} value={String(subject.id)}>
                  {formatSubjectDisplay(subject, { includeId: true })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Chapter</label>
            <select
              value={chapterId}
              onChange={(event) => {
                setChapterId(event.target.value);
                setTopicId("");
              }}
              disabled={!subjectId}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">Select</option>
              {availableChapters.map((chapter) => (
                <option key={chapter.id} value={String(chapter.id)}>
                  {chapter.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Topic</label>
            <select
              value={topicId}
              onChange={(event) => setTopicId(event.target.value)}
              disabled={!chapterId}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">Select</option>
              {availableTopics.map((topic) => (
                <option key={topic.id} value={String(topic.id)}>
                  {topic.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? "Saving..." : initialPassage ? "Save Passage" : "Create Passage"}
          </button>
        </div>
      </form>
    </div>
  );
}
