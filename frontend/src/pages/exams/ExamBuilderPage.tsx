import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import ExamShell from "@/features/exams/components/ExamShell";
import ExamStatusBadge from "@/components/ui/ExamStatusBadge";
import {
  configureExamSectionSyllabus,
  fetchExamById,
  fetchExamPreview,
  fetchExamSectionSyllabusOptions,
  finalizeBlueprintExam,
  generateExamSectionQuestions,
} from "@/features/exams/api";
import type {
  CurriculumOption,
  ExamBuilderSection,
  ExamPreviewPayload,
  GeneratedExamQuestion,
  QuestionGroupType,
} from "@/features/exams/types";

type SectionEditorState = {
  subjectId: string;
  selectedChapterIds: string[];
  selectedTopicIds: string[];
  subjects: CurriculumOption[];
  chapters: CurriculumOption[];
  topics: CurriculumOption[];
  loadingOptions: boolean;
  savingConfig: boolean;
  generating: boolean;
};

const QUESTION_GROUP_LABELS: Record<QuestionGroupType, string> = {
  direction: "Direction Questions",
  similar: "Similar Questions",
  previous_year: "Previous Year Questions",
  reference: "Reference Questions",
};

const createDefaultEditorState = (): SectionEditorState => ({
  subjectId: "",
  selectedChapterIds: [],
  selectedTopicIds: [],
  subjects: [],
  chapters: [],
  topics: [],
  loadingOptions: false,
  savingConfig: false,
  generating: false,
});

const readApiErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data as { error?: string; message?: string } | undefined;
  return data?.error || data?.message || fallback;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleString();
};

const toHtmlString = (value: unknown) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    const html = (value as { html?: string }).html;
    const text = (value as { text?: string }).text;
    if (typeof html === "string" && html.trim()) return html;
    if (typeof text === "string" && text.trim()) return text;
  }
  return "";
};

const SectionQuestionTable = ({
  title,
  questions,
}: {
  title: string;
  questions: GeneratedExamQuestion[];
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white">
    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
        {questions.length}
      </span>
    </div>
    {questions.length === 0 ? (
      <div className="px-4 py-5 text-sm text-slate-500">No generated questions in this group.</div>
    ) : (
      <div className="divide-y divide-slate-100">
        {questions.map((question) => {
          const prompt = toHtmlString(question.question_text);
          const solution = toHtmlString(question.solution);
          return (
            <div key={`${question.question_id}-${question.order_index}`} className="px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      Q{question.order_index}
                    </span>
                    <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                      {question.question_type}
                    </span>
                    {question.difficulty_level && (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        {question.difficulty_level}
                      </span>
                    )}
                  </div>
                  <div
                    className="prose prose-sm mt-3 max-w-none text-slate-700"
                    dangerouslySetInnerHTML={{ __html: prompt || "<p>Question preview unavailable.</p>" }}
                  />
                  {solution && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Solution
                      </div>
                      <div
                        className="prose prose-sm mt-2 max-w-none text-slate-600"
                        dangerouslySetInnerHTML={{ __html: solution }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

export default function ExamBuilderPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const examId = Number(id);
  const [preview, setPreview] = useState<ExamPreviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editors, setEditors] = useState<Record<number, SectionEditorState>>({});
  const [finalizing, setFinalizing] = useState(false);

  const loadPreview = async () => {
    if (!Number.isInteger(examId) || examId <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const examRecord = await fetchExamById(examId);
      const previewPayload = await fetchExamPreview(examId);
      setPreview({
        ...previewPayload,
        exam: {
          ...previewPayload.exam,
          status: previewPayload.exam.status ?? examRecord.status,
          title: previewPayload.exam.title ?? examRecord.title,
        },
      });
    } catch (err) {
      setError(readApiErrorMessage(err, "Failed to load exam builder."));
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPreview();
  }, [examId]);

  useEffect(() => {
    if (!preview) return;
    setEditors((prev) => {
      const next = { ...prev };
      for (const section of preview.sections) {
        const existing = next[section.id] ?? createDefaultEditorState();
        next[section.id] = {
          ...existing,
          subjectId:
            existing.subjectId ||
            (section.selected_subject_id ? String(section.selected_subject_id) : ""),
          selectedChapterIds:
            existing.selectedChapterIds.length > 0
              ? existing.selectedChapterIds
              : (section.chapter_ids ?? []).map(String),
          selectedTopicIds:
            existing.selectedTopicIds.length > 0
              ? existing.selectedTopicIds
              : (section.topic_ids ?? []).map(String),
        };
      }
      return next;
    });
  }, [preview]);

  const loadSectionOptions = async (section: ExamBuilderSection, nextSubjectId?: string, nextChapterIds?: string[]) => {
    setEditors((prev) => ({
      ...prev,
      [section.id]: {
        ...(prev[section.id] ?? createDefaultEditorState()),
        loadingOptions: true,
      },
    }));

    try {
      const payload = await fetchExamSectionSyllabusOptions(examId, section.id, {
        subject_id: nextSubjectId ? Number(nextSubjectId) : undefined,
        chapter_ids: nextChapterIds?.map(Number),
      });

      setEditors((prev) => ({
        ...prev,
        [section.id]: {
          ...(prev[section.id] ?? createDefaultEditorState()),
          subjectId: nextSubjectId ?? prev[section.id]?.subjectId ?? "",
          selectedChapterIds: nextChapterIds ?? prev[section.id]?.selectedChapterIds ?? [],
          selectedTopicIds: prev[section.id]?.selectedTopicIds ?? [],
          subjects: payload.subjects ?? [],
          chapters: payload.chapters ?? [],
          topics: payload.topics ?? [],
          loadingOptions: false,
        },
      }));
    } catch (err) {
      setEditors((prev) => ({
        ...prev,
        [section.id]: {
          ...(prev[section.id] ?? createDefaultEditorState()),
          loadingOptions: false,
        },
      }));
      toast.error(readApiErrorMessage(err, "Failed to load syllabus options."));
    }
  };

  useEffect(() => {
    if (!preview) return;
    preview.sections.forEach((section) => {
      const editor = editors[section.id];
      if (!editor || editor.subjects.length === 0) {
        void loadSectionOptions(
          section,
          section.selected_subject_id ? String(section.selected_subject_id) : "",
          (section.chapter_ids ?? []).map(String)
        );
      }
    });
  }, [preview]);

  const handleSubjectChange = async (section: ExamBuilderSection, subjectId: string) => {
    setEditors((prev) => ({
      ...prev,
      [section.id]: {
        ...(prev[section.id] ?? createDefaultEditorState()),
        subjectId,
        selectedChapterIds: [],
        selectedTopicIds: [],
        chapters: [],
        topics: [],
      },
    }));

    if (subjectId) {
      await loadSectionOptions(section, subjectId, []);
    }
  };

  const handleChapterToggle = async (section: ExamBuilderSection, chapterId: string, checked: boolean) => {
    const editor = editors[section.id] ?? createDefaultEditorState();
    const nextChapterIds = checked
      ? [...editor.selectedChapterIds, chapterId]
      : editor.selectedChapterIds.filter((idValue) => idValue !== chapterId);

    const validTopicIds = editor.selectedTopicIds.filter((topicId) => {
      const topic = editor.topics.find((item) => String(item.id) === topicId);
      return topic ? nextChapterIds.includes(String(topic.chapter_id)) : false;
    });

    setEditors((prev) => ({
      ...prev,
      [section.id]: {
        ...(prev[section.id] ?? createDefaultEditorState()),
        selectedChapterIds: nextChapterIds,
        selectedTopicIds: validTopicIds,
      },
    }));

    if (editor.subjectId) {
      await loadSectionOptions(section, editor.subjectId, nextChapterIds);
    }
  };

  const handleTopicToggle = (sectionId: number, topicId: string, checked: boolean) => {
    setEditors((prev) => {
      const current = prev[sectionId] ?? createDefaultEditorState();
      return {
        ...prev,
        [sectionId]: {
          ...current,
          selectedTopicIds: checked
            ? [...current.selectedTopicIds, topicId]
            : current.selectedTopicIds.filter((idValue) => idValue !== topicId),
        },
      };
    });
  };

  const handleConfigureSection = async (section: ExamBuilderSection) => {
    const editor = editors[section.id] ?? createDefaultEditorState();
    if (!editor.subjectId) {
      toast.error("Select a subject for this section.");
      return;
    }
    if (editor.selectedChapterIds.length === 0) {
      toast.error("Select at least one chapter.");
      return;
    }
    if (editor.selectedTopicIds.length === 0) {
      toast.error("Select at least one topic.");
      return;
    }

    setEditors((prev) => ({
      ...prev,
      [section.id]: {
        ...editor,
        savingConfig: true,
      },
    }));

    try {
      await configureExamSectionSyllabus(examId, section.id, {
        subject_id: Number(editor.subjectId),
        chapter_ids: editor.selectedChapterIds.map(Number),
        topic_ids: editor.selectedTopicIds.map(Number),
      });
      toast.success(`${section.title} syllabus saved.`);
      await loadPreview();
    } catch (err) {
      toast.error(readApiErrorMessage(err, "Failed to save section syllabus."));
    } finally {
      setEditors((prev) => ({
        ...prev,
        [section.id]: {
          ...(prev[section.id] ?? createDefaultEditorState()),
          savingConfig: false,
        },
      }));
    }
  };

  const handleGenerateSection = async (section: ExamBuilderSection) => {
    setEditors((prev) => ({
      ...prev,
      [section.id]: {
        ...(prev[section.id] ?? createDefaultEditorState()),
        generating: true,
      },
    }));

    try {
      await generateExamSectionQuestions(examId, section.id);
      toast.success(`${section.title} generated successfully.`);
      await loadPreview();
    } catch (err) {
      toast.error(readApiErrorMessage(err, "Failed to generate section questions."));
    } finally {
      setEditors((prev) => ({
        ...prev,
        [section.id]: {
          ...(prev[section.id] ?? createDefaultEditorState()),
          generating: false,
        },
      }));
    }
  };

  const handleFinalize = async () => {
    if (!preview?.all_sections_completed) {
      toast.error("Complete every blueprint section before finalizing the exam.");
      return;
    }

    setFinalizing(true);
    try {
      const payload = await finalizeBlueprintExam(examId, { status: "draft" });
      setPreview(payload);
      toast.success("Exam saved successfully.");
    } catch (err) {
      toast.error(readApiErrorMessage(err, "Failed to finalize exam."));
    } finally {
      setFinalizing(false);
    }
  };

  const completedSections = preview?.sections.filter((section) => section.completion_status === "completed").length ?? 0;

  return (
    <ExamShell title="Exam Builder" description="Configure each blueprint section with syllabus filters, generate questions, then preview the paper.">
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          Loading exam builder...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-sm">
          {error}
        </div>
      ) : !preview ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          Exam not found.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-slate-900">{preview.exam.title}</h2>
                    <ExamStatusBadge status={String(preview.exam.status ?? "draft").toLowerCase() as any} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{preview.exam.description || "No description provided."}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/exams")}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Back to Exams
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Program</div>
                  <div className="mt-1 text-sm font-semibold text-slate-800">{preview.exam.program_id ?? "--"}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Blueprint</div>
                  <div className="mt-1 text-sm font-semibold text-slate-800">{preview.blueprint?.name ?? "--"}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Window</div>
                  <div className="mt-1 text-sm font-semibold text-slate-800">
                    {formatDateTime(preview.exam.start_datetime)} to {formatDateTime(preview.exam.end_datetime)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Progress</div>
                  <div className="mt-1 text-sm font-semibold text-slate-800">
                    {completedSections}/{preview.totals.section_count} sections ready
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Paper Summary</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Required Questions</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">{preview.totals.required_question_count}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Generated Questions</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">{preview.totals.question_count}</div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-800">Preview status</div>
                <p className="mt-1 text-sm text-slate-600">
                  {preview.all_sections_completed
                    ? "All sections are filled. You can save the full exam now."
                    : "Complete every section to unlock the final preview state."}
                </p>
              </div>

              <button
                type="button"
                onClick={handleFinalize}
                disabled={!preview.all_sections_completed || finalizing}
                className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {finalizing ? "Saving..." : "Save Exam Preview"}
              </button>
            </div>
          </div>

          <div className="space-y-5">
            {preview.sections.map((section) => {
              const editor = editors[section.id] ?? createDefaultEditorState();
              const groupedTopics = editor.topics.filter((topic) =>
                editor.selectedChapterIds.includes(String(topic.chapter_id))
              );

              return (
                <div key={section.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">{section.title}</h3>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          Needs {section.required_question_count ?? 0}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          {section.completion_status ?? "pending"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        Select one subject, then narrow the syllabus using chapters and topics for this section.
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Generated</div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {section.question_count ?? 0}/{section.required_question_count ?? 0} questions
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-500">Subject</label>
                        <select
                          value={editor.subjectId}
                          onChange={(event) => void handleSubjectChange(section, event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                        >
                          <option value="">Select subject</option>
                          {editor.subjects.map((subject) => (
                            <option key={subject.id} value={String(subject.id)}>
                              {subject.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-semibold text-slate-800">Chapters</h4>
                          {editor.loadingOptions && <span className="text-xs text-slate-500">Loading...</span>}
                        </div>
                        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                          {editor.chapters.length === 0 ? (
                            <div className="text-sm text-slate-500">Choose a subject to load chapters.</div>
                          ) : (
                            editor.chapters.map((chapter) => {
                              const checked = editor.selectedChapterIds.includes(String(chapter.id));
                              return (
                                <label key={chapter.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(event) =>
                                      void handleChapterToggle(section, String(chapter.id), event.target.checked)
                                    }
                                    className="mt-1"
                                  />
                                  <span>
                                    {chapter.name}
                                    {chapter.chapter_number !== undefined && chapter.chapter_number !== null && (
                                      <span className="ml-2 text-xs text-slate-400">#{chapter.chapter_number}</span>
                                    )}
                                  </span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <h4 className="text-sm font-semibold text-slate-800">Topics</h4>
                        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                          {groupedTopics.length === 0 ? (
                            <div className="text-sm text-slate-500">Select chapters to load topics.</div>
                          ) : (
                            groupedTopics.map((topic) => {
                              const checked = editor.selectedTopicIds.includes(String(topic.id));
                              return (
                                <label key={topic.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(event) =>
                                      handleTopicToggle(section.id, String(topic.id), event.target.checked)
                                    }
                                    className="mt-1"
                                  />
                                  <span>{topic.name}</span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleConfigureSection(section)}
                          disabled={editor.savingConfig}
                          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {editor.savingConfig ? "Saving..." : "Save Syllabus"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleGenerateSection(section)}
                          disabled={editor.generating}
                          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {editor.generating ? "Generating..." : section.question_count ? "Regenerate Section" : "Generate Section"}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800">Configured Syllabus</h4>
                            <p className="mt-1 text-xs text-slate-500">
                              Edit subject, chapter, or topic selection any time before the exam is locked.
                            </p>
                          </div>
                          {section.selected_subject_name && (
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                              {section.selected_subject_name}
                            </span>
                          )}
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Chapters</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(section.chapters ?? []).length === 0 ? (
                                <span className="text-sm text-slate-500">No chapters selected</span>
                              ) : (
                                section.chapters?.map((chapter) => (
                                  <span key={chapter.id} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
                                    {chapter.name}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Topics</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(section.topics ?? []).length === 0 ? (
                                <span className="text-sm text-slate-500">No topics selected</span>
                              ) : (
                                section.topics?.map((topic) => (
                                  <span key={topic.id} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
                                    {topic.name}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4">
                        {(Object.keys(QUESTION_GROUP_LABELS) as QuestionGroupType[]).map((groupType) => (
                          <SectionQuestionTable
                            key={`${section.id}-${groupType}`}
                            title={QUESTION_GROUP_LABELS[groupType]}
                            questions={section.question_groups?.[groupType] ?? []}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </ExamShell>
  );
}
