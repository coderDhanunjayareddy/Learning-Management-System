import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import api from "@/lib/api";
import ExamShell from "@/features/exams/components/ExamShell";
import ExamStatusBadge from "@/components/ui/ExamStatusBadge";
import Pagination from "@/components/ui/Pagination";
import QuestionFilters, { type QuestionFiltersState } from "@/features/question-bank/components/QuestionFilters";
import QuestionRenderer from "@/components/questions/QuestionRenderer";
import { computeExamStatus } from "@/features/exams/utils/computeExamStatus";
import type { ExamSection, ExamSummary, ExamStatus } from "@/features/exams/types";
import type { CurriculumItem, Question } from "@/types/questionBank";

interface ExamDetail extends ExamSummary {
  sections?: ExamSection[];
  total_duration_minutes?: number | null;
  question_count?: number | null;
  section_count?: number | null;
}

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
      code: item.code ?? null,
      program_id: item.program_id ?? item.programId ?? null,
      grade_id: item.grade_id ?? item.gradeId ?? null,
      grade_number: item.grade_number ?? item.gradeNumber ?? null,
      subject_id: item.subject_id ?? item.subjectId ?? null,
      chapter_id: item.chapter_id ?? item.chapterId ?? null,
    }))
    .filter((item) => item.id !== undefined && item.id !== null);

const resolveQuestionText = (value: any) => {
  if (typeof value === "string") return { html: value, json: null };
  if (value && typeof value === "object") {
    return { html: value.html ?? value.text ?? "", json: value.json ?? null };
  }
  return { html: "", json: null };
};

const normalizeOptions = (options: any) => {
  if (!Array.isArray(options)) return [];
  return options.map((option, index) => {
    if (typeof option === "string") {
      return { id: `${index}`, text: { html: option, json: null } };
    }
    if (option && typeof option === "object") {
      return {
        id: String(option.id ?? index),
        text: typeof option.text === "object" ? option.text : { html: option.text ?? option.label ?? option.value ?? "", json: null },
        is_correct: option.is_correct ?? option.isCorrect ?? option.correct ?? undefined,
      };
    }
    return { id: `${index}`, text: { html: String(option ?? ""), json: null } };
  });
};

const normalizeQuestions = (items: any[]): Question[] =>
  items.map((item) => ({
    id: item.id ?? item.question_id ?? `${Math.random()}`,
    question_type: item.question_type ?? "mcq_single",
    question_text: resolveQuestionText(item.question_text),
    options: normalizeOptions(item.options),
    correct_answer: item.correct_answer ?? null,
    solution: resolveQuestionText(item.solution),
    solution_video_url: item.solution_video_url ?? null,
    scoring_mode: item.scoring_mode ?? "all_or_nothing",
    comprehension_passage: resolveQuestionText(item.comprehension_passage),
    comprehension_questions: item.comprehension_questions ?? [],
    program_id: item.program_id ?? null,
    grade_id: item.grade_id ?? null,
    subject_id: item.subject_id ?? null,
    chapter_id: item.chapter_id ?? null,
    topic_id: item.topic_id ?? null,
    difficulty_level: item.difficulty_level ?? "easy",
    marks_positive: Number(item.marks_positive ?? 4),
    marks_negative: Number(item.marks_negative ?? 1),
    exam_tags: item.exam_tags ?? [],
    status: item.status ?? "draft",
    created_by:
      item.created_by_name ??
      (item.created_by !== undefined && item.created_by !== null ? String(item.created_by) : "Unknown"),
    created_at: item.created_at ?? null,
    review_note: item.review_note ?? item.rejection_reason ?? null,
  }));

const normalizeStatus = (value?: string | null): ExamStatus | null => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === "draft" || normalized === "active" || normalized === "completed") {
    return normalized;
  }
  return null;
};

const parseNumberOrNull = (value: string) => {
  if (value === "") return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

interface SectionDraft {
  title: string;
  marks_per_question: string;
  negative_marks: string;
}

type SelectedQuestion = Question;

const buildSectionEdits = (sectionList: ExamSection[]) => {
  const editMap: Record<string, SectionDraft> = {};
  sectionList.forEach((section) => {
    editMap[String(section.id)] = {
      title: section.title ?? "",
      marks_per_question:
        section.marks_per_question !== null && section.marks_per_question !== undefined
          ? String(section.marks_per_question)
          : "",
      negative_marks:
        section.negative_marks !== null && section.negative_marks !== undefined
          ? String(section.negative_marks)
          : "",
    };
  });
  return editMap;
};

const buildDemoExam = (): ExamDetail => {
  const now = new Date();
  const start = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const end = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();
  const sections: ExamSection[] = [
    {
      id: 101,
      title: "Section A",
      marks_per_question: 4,
      negative_marks: 1,
      question_count: 15,
    },
    {
      id: 102,
      title: "Section B",
      marks_per_question: 2,
      negative_marks: 0.5,
      question_count: 10,
    },
  ];

  return {
    id: "demo",
    title: "Demo Exam",
    description: "This is a local demo record for the builder UI.",
    status: "draft",
    start_datetime: start,
    end_datetime: end,
    total_duration_minutes: 90,
    section_count: sections.length,
    question_count: sections.reduce((sum, section) => sum + (section.question_count ?? 0), 0),
    sections,
  };
};

function QuestionSelectionModal({
  open,
  section,
  selectedIds,
  onToggle,
  onClose,
}: {
  open: boolean;
  section: ExamSection | null;
  selectedIds: Set<string>;
  onToggle: (question: Question) => void;
  onClose: () => void;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [programs, setPrograms] = useState<CurriculumItem[]>([]);
  const [grades, setGrades] = useState<CurriculumItem[]>([]);
  const [subjects, setSubjects] = useState<CurriculumItem[]>([]);
  const [chapters, setChapters] = useState<CurriculumItem[]>([]);
  const [topics, setTopics] = useState<CurriculumItem[]>([]);

  const [filters, setFilters] = useState<QuestionFiltersState>({
    search: "",
    programId: "",
    gradeId: "",
    subjectId: "",
    chapterId: "",
    topicId: "",
    difficulty: "",
    type: "",
    status: "approved",
  });

  useEffect(() => {
    if (!open) return;
    const loadPrograms = async () => {
      try {
        const res = await api.get("/programs");
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        setPrograms(normalizeCurriculum(payload));
      } catch {
        setPrograms([]);
      }
    };
    loadPrograms();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!filters.programId) {
      setGrades([]);
      setSubjects([]);
      setChapters([]);
      setTopics([]);
      return;
    }
    const loadGrades = async () => {
      try {
        const res = await api.get(`/programs/${filters.programId}/grades`);
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        setGrades(normalizeCurriculum(payload));
      } catch {
        setGrades([]);
      }
    };
    loadGrades();
  }, [filters.programId, open]);

  useEffect(() => {
    if (!open) return;
    if (!filters.gradeId) {
      setSubjects([]);
      setChapters([]);
      setTopics([]);
      return;
    }
    const loadSubjects = async () => {
      try {
        const res = await api.get(`/grades/${filters.gradeId}/subjects`);
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        setSubjects(normalizeCurriculum(payload));
      } catch {
        setSubjects([]);
      }
    };
    loadSubjects();
  }, [filters.gradeId, open]);

  useEffect(() => {
    if (!open) return;
    if (!filters.subjectId) {
      setChapters([]);
      setTopics([]);
      return;
    }
    const loadChapters = async () => {
      try {
        const res = await api.get(`/subjects/${filters.subjectId}/chapters`);
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        setChapters(normalizeCurriculum(payload));
      } catch {
        setChapters([]);
      }
    };
    loadChapters();
  }, [filters.subjectId, open]);

  useEffect(() => {
    if (!open) return;
    if (!filters.chapterId) {
      setTopics([]);
      return;
    }
    const loadTopics = async () => {
      try {
        const res = await api.get(`/chapters/${filters.chapterId}/topics`);
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        setTopics(normalizeCurriculum(payload));
      } catch {
        setTopics([]);
      }
    };
    loadTopics();
  }, [filters.chapterId, open]);

  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    const loadQuestions = async () => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = {
          page,
          page_size: pageSize,
        };
        if (filters.search.trim()) params.q = filters.search.trim();
        if (filters.programId) params.program_id = filters.programId;
        if (filters.gradeId) params.grade_id = filters.gradeId;
        if (filters.subjectId) params.subject_id = filters.subjectId;
        if (filters.chapterId) params.chapter_id = filters.chapterId;
        if (filters.topicId) params.topic_id = filters.topicId;
        if (filters.difficulty) params.difficulty_level = filters.difficulty;
        if (filters.type) params.question_type = filters.type;
        if (filters.status) params.status = filters.status;

        const res = await api.get("/questions", { params });
        const payload = Array.isArray(res.data?.data) ? res.data.data : [];
        if (!isMounted) return;
        const normalized = normalizeQuestions(payload);
        setQuestions(normalized);
        setTotal(Number(res.data?.total ?? normalized.length));
      } catch {
        if (!isMounted) return;
        setQuestions([]);
        setTotal(0);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadQuestions();

    return () => {
      isMounted = false;
    };
  }, [filters, page, open]);

  useEffect(() => {
    if (open) setPage(1);
  }, [filters, open]);

  if (!open || !section) return null;

  const availableChapters = chapters.filter(
    (chapter) => !filters.subjectId || String(chapter.subject_id) === filters.subjectId
  );
  const availableTopics = topics.filter(
    (topic) => !filters.chapterId || String(topic.chapter_id) === filters.chapterId
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold">Add Questions</h3>
            <p className="text-sm text-slate-500">Section: {section.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              Not saved yet
            </span>
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Done
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <QuestionFilters
              layout="vertical"
              filters={filters}
              programs={programs}
              grades={grades}
              subjects={subjects}
              chapters={availableChapters}
              topics={availableTopics}
              onChange={setFilters}
            />
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                Loading questions...
              </div>
            ) : questions.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No questions match the current filters.
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((question) => {
                  const id = String(question.id);
                  const isSelected = selectedIds.has(id);
                  return (
                    <div key={id} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggle(question)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold">
                            {question.question_type}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold">
                            {question.difficulty_level}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold">
                            {question.status}
                          </span>
                        </div>
                        <div className="mt-2">
                          <QuestionRenderer
                            question={question}
                            showMeta={false}
                            showOptions={false}
                            showAnswer={false}
                            showSolution={false}
                            showComprehension={false}
                            contentClassName="text-sm font-semibold text-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExamBuilderPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [sections, setSections] = useState<ExamSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newSection, setNewSection] = useState<SectionDraft>({
    title: "",
    marks_per_question: "4",
    negative_marks: "1",
  });

  const [sectionEdits, setSectionEdits] = useState<Record<string, SectionDraft>>({});
  const [savingSectionId, setSavingSectionId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<ExamSection | null>(null);
  const [selectedQuestionsBySection, setSelectedQuestionsBySection] = useState<Record<string, SelectedQuestion[]>>({});

  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadExam = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/exams/${id}`);
        if (!mounted) return;
        const payload = res.data as ExamDetail;
        setExam(payload);
        const sectionList = Array.isArray(payload.sections) ? payload.sections : [];
        setSections(sectionList);
        setSectionEdits(buildSectionEdits(sectionList));
      } catch (err: any) {
        if (!mounted) return;
        const demo = buildDemoExam();
        setExam(demo);
        const sectionList = Array.isArray(demo.sections) ? demo.sections : [];
        setSections(sectionList);
        setSectionEdits(buildSectionEdits(sectionList));
        setError(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadExam();

    return () => {
      mounted = false;
    };
  }, [id]);

  const effectiveStatus = normalizeStatus(exam?.status ?? null) ?? computeExamStatus(exam ?? {});
  const isReadOnly = exam?.status ? exam.status !== "draft" : effectiveStatus !== "draft";

  const publishValidation = useMemo(
    () =>
      sections.map((section) => {
        const local = selectedQuestionsBySection[String(section.id)] ?? [];
        const count = local.length > 0 ? local.length : section.question_count ?? 0;
        return {
          section,
          count,
          valid: count >= 1,
        };
      }),
    [sections, selectedQuestionsBySection]
  );
  const canPublish = publishValidation.every((item) => item.valid);

  const handleAddSection = async () => {
    if (!id) return;
    if (!newSection.title.trim()) {
      toast.error("Section name is required");
      return;
    }

    const marks = parseNumberOrNull(newSection.marks_per_question);
    const negative = parseNumberOrNull(newSection.negative_marks);
    if (newSection.marks_per_question !== "" && marks === null) {
      toast.error("Marks per question must be a number");
      return;
    }
    if (newSection.negative_marks !== "" && negative === null) {
      toast.error("Negative marks must be a number");
      return;
    }

    try {
      const payload = {
        title: newSection.title.trim(),
        marks_per_question: marks,
        negative_marks: negative,
      };
      const res = await api.post(`/exams/${id}/sections`, payload);
      const created = res.data as ExamSection;
      const nextSection = {
        ...created,
        question_count: created.question_count ?? 0,
      };
      setSections((prev) => [...prev, nextSection]);
      setSectionEdits((prev) => ({
        ...prev,
        [String(nextSection.id)]: {
          title: nextSection.title,
          marks_per_question: String(nextSection.marks_per_question ?? ""),
          negative_marks: String(nextSection.negative_marks ?? ""),
        },
      }));
      setNewSection({ title: "", marks_per_question: "4", negative_marks: "1" });
      toast.success("Section added");
    } catch (err: any) {
      const message = err?.response?.data?.error || "Failed to add section.";
      toast.error(message);
    }
  };

  const handleSaveSection = async (section: ExamSection) => {
    if (!id) return;
    const draft = sectionEdits[String(section.id)];
    if (!draft) return;
    if (!draft.title.trim()) {
      toast.error("Section name is required");
      return;
    }

    const marks = parseNumberOrNull(draft.marks_per_question);
    const negative = parseNumberOrNull(draft.negative_marks);
    if (draft.marks_per_question !== "" && marks === null) {
      toast.error("Marks per question must be a number");
      return;
    }
    if (draft.negative_marks !== "" && negative === null) {
      toast.error("Negative marks must be a number");
      return;
    }

    try {
      setSavingSectionId(String(section.id));
      const payload = {
        title: draft.title.trim(),
        marks_per_question: marks,
        negative_marks: negative,
      };
      const res = await api.put(`/exams/${id}/sections/${section.id}`, payload);
      const updated = res.data as ExamSection;
      setSections((prev) =>
        prev.map((item) => (item.id === section.id ? { ...item, ...updated } : item))
      );
      toast.success("Section updated");
    } catch (err: any) {
      const message = err?.response?.data?.error || "Failed to update section.";
      toast.error(message);
    } finally {
      setSavingSectionId(null);
    }
  };

  const handleDeleteSection = async (section: ExamSection) => {
    if (!id) return;
    const ok = window.confirm("Delete this section? This cannot be undone.");
    if (!ok) return;

    try {
      await api.delete(`/exams/${id}/sections/${section.id}`);
      setSections((prev) => prev.filter((item) => item.id !== section.id));
      setSectionEdits((prev) => {
        const next = { ...prev };
        delete next[String(section.id)];
        return next;
      });
      toast.success("Section deleted");
    } catch (err: any) {
      const message = err?.response?.data?.error || "Failed to delete section.";
      toast.error(message);
    }
  };

  const openModal = (section: ExamSection) => {
    setActiveSection(section);
    setModalOpen(true);
  };

  const handleToggleQuestion = (question: Question) => {
    if (!activeSection) return;
    const sectionId = String(activeSection.id);
    setSelectedQuestionsBySection((prev) => {
      const current = [...(prev[sectionId] ?? [])];
      const questionId = String(question.id);
      const existingIndex = current.findIndex((item) => String(item.id) === questionId);
      if (existingIndex >= 0) {
        current.splice(existingIndex, 1);
      } else {
        current.push(question);
      }
      return {
        ...prev,
        [sectionId]: current,
      };
    });
  };

  const handleRemoveSelectedQuestion = (sectionId: number, questionId: string) => {
    const key = String(sectionId);
    setSelectedQuestionsBySection((prev) => {
      const current = prev[key] ?? [];
      return {
        ...prev,
        [key]: current.filter((question) => String(question.id) !== questionId),
      };
    });
  };

  const handleReorderSelectedQuestions = (sectionId: number, result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    const key = String(sectionId);
    setSelectedQuestionsBySection((prev) => {
      const current = [...(prev[key] ?? [])];
      const [moved] = current.splice(result.source.index, 1);
      if (!moved) return prev;
      current.splice(result.destination!.index, 0, moved);
      return {
        ...prev,
        [key]: current,
      };
    });
  };

  const closeModal = () => {
    setModalOpen(false);
    setActiveSection(null);
  };

  const selectionCount = (sectionId: number) =>
    selectedQuestionsBySection[String(sectionId)]?.length ?? 0;

  const handlePublish = async () => {
    if (!id || !canPublish) return;
    try {
      setPublishing(true);
      const res = await api.post(`/exams/${id}/publish`);
      setExam((prev) =>
        prev ? { ...prev, status: res.data?.status ?? "published" } : prev
      );
      toast.success("Exam published");
      setPublishModalOpen(false);
    } catch (err: any) {
      const message = err?.response?.data?.error || "Failed to publish exam.";
      toast.error(message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <ExamShell title="Exam Builder" description="Manage sections and build the exam paper.">
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading exam...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error}
        </div>
      ) : !exam ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Exam not found.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{exam.title}</h2>
              <p className="text-sm text-slate-500">
                {exam.section_count ?? sections.length} sections · {exam.question_count ?? 0} questions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ExamStatusBadge status={effectiveStatus} />
              {!isReadOnly && (
                <button
                  onClick={() => setPublishModalOpen(true)}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Publish Exam
                </button>
              )}
              <button
                onClick={() => navigate("/exams")}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Back to Exams
              </button>
            </div>
          </div>

          {isReadOnly && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              This exam is not in draft state. Section edits are disabled.
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Add Section</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-[2fr_1fr_1fr_auto]">
              <input
                type="text"
                value={newSection.title}
                onChange={(event) => setNewSection((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Section name"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                disabled={isReadOnly}
              />
              <input
                type="number"
                value={newSection.marks_per_question}
                onChange={(event) => setNewSection((prev) => ({ ...prev, marks_per_question: event.target.value }))}
                placeholder="Marks"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                disabled={isReadOnly}
              />
              <input
                type="number"
                value={newSection.negative_marks}
                onChange={(event) => setNewSection((prev) => ({ ...prev, negative_marks: event.target.value }))}
                placeholder="Negative"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                disabled={isReadOnly}
              />
              <button
                type="button"
                onClick={handleAddSection}
                disabled={isReadOnly}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Add
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {sections.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                No sections created yet.
              </div>
            ) : (
              sections.map((section) => {
                const draft = sectionEdits[String(section.id)] ?? {
                  title: section.title,
                  marks_per_question: String(section.marks_per_question ?? ""),
                  negative_marks: String(section.negative_marks ?? ""),
                };
                const selectedCount = selectionCount(section.id);
                return (
                  <div key={section.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            {section.question_count ?? 0} questions
                          </span>
                          {selectedCount > 0 && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                              {selectedCount} selected (not saved)
                            </span>
                          )}
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <div>
                            <label className="text-xs font-semibold text-slate-500">Section Name</label>
                            <input
                              type="text"
                              value={draft.title}
                              onChange={(event) =>
                                setSectionEdits((prev) => ({
                                  ...prev,
                                  [String(section.id)]: {
                                    ...draft,
                                    title: event.target.value,
                                  },
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                              disabled={isReadOnly}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-500">Marks / Question</label>
                            <input
                              type="number"
                              value={draft.marks_per_question}
                              onChange={(event) =>
                                setSectionEdits((prev) => ({
                                  ...prev,
                                  [String(section.id)]: {
                                    ...draft,
                                    marks_per_question: event.target.value,
                                  },
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                              disabled={isReadOnly}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-500">Negative Marks</label>
                            <input
                              type="number"
                              value={draft.negative_marks}
                              onChange={(event) =>
                                setSectionEdits((prev) => ({
                                  ...prev,
                                  [String(section.id)]: {
                                    ...draft,
                                    negative_marks: event.target.value,
                                  },
                                }))
                              }
                              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                              disabled={isReadOnly}
                            />
                          </div>
                        </div>
                        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className="text-sm font-semibold text-slate-700">Selected Questions</h4>
                            {selectedCount > 0 && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                Not saved yet
                              </span>
                            )}
                          </div>

                          {selectedCount === 0 ? (
                            <div className="mt-3 text-xs text-slate-500">No selected questions yet.</div>
                          ) : (
                            <DragDropContext
                              onDragEnd={(result) => handleReorderSelectedQuestions(section.id, result)}
                            >
                              <Droppable droppableId={`section-${section.id}`}>
                                {(dropProvided) => (
                                  <div
                                    ref={dropProvided.innerRef}
                                    {...dropProvided.droppableProps}
                                    className="mt-3 space-y-3"
                                  >
                                    {(selectedQuestionsBySection[String(section.id)] ?? []).map((question, index) => (
                                      <Draggable
                                        key={`section-${section.id}-question-${question.id}`}
                                        draggableId={`section-${section.id}-question-${question.id}`}
                                        index={index}
                                        isDragDisabled={isReadOnly}
                                      >
                                        {(dragProvided) => (
                                          <div
                                            ref={dragProvided.innerRef}
                                            {...dragProvided.draggableProps}
                                            className="rounded-lg border border-slate-200 bg-white p-3"
                                          >
                                            <div className="flex gap-3">
                                              <div
                                                {...dragProvided.dragHandleProps}
                                                className="mt-1 cursor-grab select-none text-slate-400"
                                              >
                                                ::
                                              </div>
                                              <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                                                    #{index + 1}
                                                  </span>
                                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold">
                                                    {question.question_type}
                                                  </span>
                                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold">
                                                    {question.difficulty_level}
                                                  </span>
                                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                                                    +{section.marks_per_question ?? 0} / -{section.negative_marks ?? 0}
                                                  </span>
                                                </div>
                                                <div className="mt-2">
                                                  <QuestionRenderer
                                                    question={question}
                                                    showMeta={false}
                                                    showOptions={false}
                                                    showAnswer={false}
                                                    showSolution={false}
                                                    showComprehension={false}
                                                    contentClassName="text-sm font-semibold text-slate-900"
                                                  />
                                                </div>
                                              </div>
                                              <button
                                                onClick={() => handleRemoveSelectedQuestion(section.id, String(question.id))}
                                                disabled={isReadOnly}
                                                className="h-7 rounded-md border border-rose-200 px-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                                              >
                                                Remove
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </Draggable>
                                    ))}
                                    {dropProvided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            </DragDropContext>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openModal(section)}
                          disabled={isReadOnly}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Add Questions
                        </button>
                        <button
                          onClick={() => handleSaveSection(section)}
                          disabled={isReadOnly || savingSectionId === String(section.id)}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {savingSectionId === String(section.id) ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => handleDeleteSection(section)}
                          disabled={isReadOnly}
                          className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <QuestionSelectionModal
        open={modalOpen}
        section={activeSection}
        selectedIds={new Set(
          (selectedQuestionsBySection[String(activeSection?.id ?? "")] ?? []).map((question) => String(question.id))
        )}
        onToggle={handleToggleQuestion}
        onClose={closeModal}
      />

      {publishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Publish Exam</h3>
                <p className="text-sm text-slate-500">
                  Confirm each section has at least 1 question before publishing.
                </p>
              </div>
              <button
                onClick={() => !publishing && setPublishModalOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {publishValidation.map((item) => (
                <div
                  key={item.section.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-semibold text-slate-700">{item.section.title}</div>
                    <div className="text-xs text-slate-500">{item.count} question(s)</div>
                  </div>
                  <span
                    className={
                      item.valid
                        ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                        : "rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700"
                    }
                  >
                    {item.valid ? "Ready" : "Needs 1+"}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setPublishModalOpen(false)}
                disabled={publishing}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={!canPublish || publishing}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {publishing ? "Publishing..." : "Yes, Publish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ExamShell>
  );
}

