import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "@/lib/api";
import ExamShell from "@/features/exams/components/ExamShell";
import ExamStatusBadge from "@/components/ui/ExamStatusBadge";
import { computeExamStatus } from "@/features/exams/utils/computeExamStatus";
import type { ExamSection, ExamSummary, ExamStatus } from "@/features/exams/types";

interface ExamDetail extends ExamSummary {
  sections?: ExamSection[];
  total_duration_minutes?: number | null;
  question_count?: number | null;
  section_count?: number | null;
}

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
      exam_id: 0,
      title: "Section A",
      marks_per_question: 4,
      negative_marks: 1,
      question_count: 15,
    },
    {
      id: 102,
      exam_id: 0,
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
      } catch {
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

  const sectionCount = sections.length;
  const totalQuestionCount = useMemo(
    () => sections.reduce((sum, section) => sum + (section.question_count ?? 0), 0),
    [sections]
  );

  const publishValidation = useMemo(
    () =>
      sections.map((section) => {
        const count = section.question_count ?? 0;
        return {
          section,
          count,
          valid: count >= 1,
        };
      }),
    [sections]
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

  const handlePublish = async () => {
    if (!id || !canPublish) return;
    try {
      setPublishing(true);
      const res = await api.post(`/exams/${id}/publish`);
      setExam((prev) => (prev ? { ...prev, status: res.data?.status ?? "published" } : prev));
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
    <ExamShell title="Exam Builder" description="Manage sections and build the exam paper." backTo="/exams">
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
                {sectionCount} sections . {totalQuestionCount} questions
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
                return (
                  <div key={section.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            {section.question_count ?? 0} questions
                          </span>
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
                            <h4 className="text-sm font-semibold text-slate-700">Questions</h4>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              {section.question_count ?? 0} added
                            </span>
                          </div>
                          <div className="mt-3 text-xs text-slate-500">
                            Manage section questions on the Add Questions page.
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => navigate(`/exams/${id}/sections/${section.id}/questions`, { state: { sectionTitle: section.title } })}
                          disabled={isReadOnly || !id}
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

