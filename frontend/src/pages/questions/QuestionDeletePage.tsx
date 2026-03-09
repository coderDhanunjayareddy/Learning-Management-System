import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import QuestionPreview from "@/features/question-bank/components/QuestionPreview";
import { mockQuestions } from "@/features/question-bank/data/mockQuestions";
import type { Question } from "@/types/questionBank";

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

export default function QuestionDeletePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await api.delete(`/questions/${id}`);
    } catch (error) {
      // fallback to local delete
    } finally {
      setDeleting(false);
    }
    navigate("/question-bank", { state: { deletedQuestionId: id } });
  };

  return (
    <QuestionBankLayout
      title="Delete Question"
      description="This action cannot be undone."
      actions={
        <button
          onClick={() => navigate("/question-bank")}
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
        <div className="space-y-4">
          <QuestionPreview question={question} />
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <p className="text-sm text-rose-700">
              You are about to permanently delete this question. Are you sure?
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-70"
              >
                {deleting ? "Deleting..." : "Yes, delete"}
              </button>
              <button
                onClick={() => navigate(`/question-bank`)}
                className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
              >
                Keep Question
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Question not found.
        </div>
      )}
    </QuestionBankLayout>
  );
}
