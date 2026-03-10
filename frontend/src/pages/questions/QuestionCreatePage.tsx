import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import QuestionForm from "@/features/question-bank/components/QuestionForm";
import type { CurriculumItem, Question } from "@/types/questionBank";

const normalizeQuestionText = (value: any) => {
  if (typeof value === "string") return { html: value, json: null };
  if (value && typeof value === "object") {
    return { html: value.html ?? value.text ?? "", json: value.json ?? null };
  }
  return { html: "", json: null };
};

const normalizeOptions = (options: any) => {
  if (!Array.isArray(options)) return [];
  return options.map((option: any, index: number) => ({
    id: String(option.id ?? index),
    text: typeof option.text === "object" ? option.text : { html: option.text ?? "", json: null },
    is_correct: option.is_correct ?? option.isCorrect ?? option.correct ?? undefined,
  }));
};

const normalizeQuestion = (item: any): Question => ({
  id: item.id ?? item.question_id ?? `${Math.random()}`,
  question_type: item.question_type ?? "mcq_single",
  question_text: normalizeQuestionText(item.question_text),
  options: normalizeOptions(item.options),
  correct_answer: item.correct_answer ?? null,
  solution: normalizeQuestionText(item.solution),
  solution_video_url: item.solution_video_url ?? null,
  scoring_mode: item.scoring_mode ?? "all_or_nothing",
  comprehension_passage: normalizeQuestionText(item.comprehension_passage),
  comprehension_questions: item.comprehension_questions ?? [],
  subject_id: item.subject_id ?? null,
  chapter_id: item.chapter_id ?? null,
  topic_id: item.topic_id ?? null,
  difficulty_level: item.difficulty_level ?? "easy",
  marks_positive: Number(item.marks_positive ?? 4),
  marks_negative: Number(item.marks_negative ?? 1),
  exam_tags: item.exam_tags ?? [],
  status: item.status ?? "draft",
  created_by: item.created_by ?? "Unknown",
  created_at: item.created_at ?? null,
  review_note: item.review_note ?? null,
});

const normalizeCurriculum = (items: any[]): CurriculumItem[] =>
  items
    .map((item) => ({
      id: item.id ?? item.subject_id ?? item.chapter_id ?? item.topic_id,
      name: item.name ?? item.title ?? item.subject_name ?? "Untitled",
      subject_id: item.subject_id ?? item.subjectId ?? null,
      chapter_id: item.chapter_id ?? item.chapterId ?? null,
    }))
    .filter((item) => item.id !== undefined && item.id !== null);

export default function QuestionCreatePage() {
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState<CurriculumItem[]>([]);
  const [chapters] = useState<CurriculumItem[]>([]);
  const [topics] = useState<CurriculumItem[]>([]);

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const res = await api.get("/subjects");
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        if (payload.length) {
          setSubjects(normalizeCurriculum(payload));
        }
      } catch {
        setSubjects([]);
      }
    };
    loadSubjects();
  }, []);

  const handleSave = async (payload: Omit<Question, "id">) => {
    try {
      const res = await api.post("/questions", payload);
      if (res.data) {
        const created = normalizeQuestion(res.data);
        navigate("/question-bank", { state: { createdQuestion: created } });
        return;
      }
    } catch (error) {
      const message =
        typeof error === "object" && error && "response" in error
          ? (error as { response?: { data?: { error?: unknown } } }).response?.data?.error
          : null;
      alert(typeof message === "string" ? message : "Failed to create question.");
      return;
    }
  };

  return (
    <QuestionBankLayout
      title="Create Question"
      description="Compose a new question for your assessment library."
      showBack={false}
      actions={
        <button
          onClick={() => navigate("/question-bank")}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      }
    >
      <QuestionForm
        variant="page"
        subjects={subjects}
        chapters={chapters}
        topics={topics}
        onClose={() => navigate("/question-bank")}
        onSave={(payload) => handleSave(payload)}
      />
    </QuestionBankLayout>
  );
}
