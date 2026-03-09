import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import QuestionForm from "@/features/question-bank/components/QuestionForm";
import { mockChapters, mockQuestions, mockSubjects, mockTopics } from "@/features/question-bank/data/mockQuestions";
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

export default function QuestionEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);

  const [subjects, setSubjects] = useState<CurriculumItem[]>(mockSubjects);
  const [chapters] = useState<CurriculumItem[]>(mockChapters);
  const [topics] = useState<CurriculumItem[]>(mockTopics);

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
      } catch (error) {
        setSubjects(mockSubjects);
      }
    };
    loadSubjects();
  }, []);

  useEffect(() => {
    if (!id) return;
    const loadQuestion = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/questions/${id}`);
        if (!res.data) throw new Error("Missing data");
        setQuestion(normalizeQuestion(res.data));
      } catch (error) {
        const fallback = mockQuestions.find((item) => String(item.id) === String(id)) ?? null;
        setQuestion(fallback);
      } finally {
        setLoading(false);
      }
    };
    loadQuestion();
  }, [id]);

  const handleSave = async (payload: Omit<Question, "id">) => {
    if (!id) return;
    try {
      const res = await api.put(`/questions/${id}`, payload);
      const updated = res.data ? normalizeQuestion(res.data) : { ...payload, id };
      navigate(`/question-bank`, { state: { updatedQuestion: updated } });
      return;
    } catch (error) {
      const updated = { ...payload, id };
      navigate(`/question-bank`, { state: { updatedQuestion: updated } });
    }
  };

  return (
    <QuestionBankLayout
      title="Edit Question"
      description="Update the question details and answers."
      showBack={false}
      actions={
        <button
          onClick={() => navigate(`/question-bank`)}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      }
    >
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading question...
        </div>
      ) : question ? (
        <QuestionForm
          variant="page"
          initialQuestion={question}
          subjects={subjects}
          chapters={chapters}
          topics={topics}
          onClose={() => navigate(`/question-bank`)}
          onSave={(payload) => handleSave(payload)}
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Question not found.
        </div>
      )}
    </QuestionBankLayout>
  );
}
