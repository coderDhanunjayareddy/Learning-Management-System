import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import QuestionPreview from "@/features/question-bank/components/QuestionPreview";
import { getQuestionPermissions } from "@/features/question-bank/utils/questionPermissions";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { mockChapters, mockQuestions, mockSubjects, mockTopics } from "@/features/question-bank/data/mockQuestions";
import type { Question } from "@/types/questionBank";

const resolveQuestionText = (value: any) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    return value.html ?? value.text ?? "";
  }
  return "";
};

const normalizeQuestion = (item: any): Question => ({
  id: item.id ?? item.question_id ?? `${Math.random()}`,
  question_type: item.question_type ?? "mcq_single",
  question_text: resolveQuestionText(item.question_text),
  options: item.options ?? [],
  correct_answer: item.correct_answer ?? null,
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

export default function QuestionDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissions = getQuestionPermissions(user?.role);

  const [question, setQuestion] = useState<Question | null>(
    (location.state as { question?: Question } | null)?.question ?? null
  );
  const [loading, setLoading] = useState(!question);
  const [dataSource, setDataSource] = useState<"api" | "mock">("api");

  useEffect(() => {
    if (question || !id) return;
    const loadQuestion = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/questions/${id}`);
        if (!res.data) throw new Error("Missing data");
        setQuestion(normalizeQuestion(res.data));
        setDataSource("api");
      } catch (error) {
        const fallback = mockQuestions.find((item) => String(item.id) === String(id)) ?? null;
        setQuestion(fallback);
        setDataSource("mock");
      } finally {
        setLoading(false);
      }
    };
    loadQuestion();
  }, [id, question]);

  const subjectName = useMemo(() => {
    if (!question?.subject_id) return "-";
    return mockSubjects.find((item) => String(item.id) === String(question.subject_id))?.name ?? "-";
  }, [question?.subject_id]);

  const chapterName = useMemo(() => {
    if (!question?.chapter_id) return "-";
    return mockChapters.find((item) => String(item.id) === String(question.chapter_id))?.name ?? "-";
  }, [question?.chapter_id]);

  const topicName = useMemo(() => {
    if (!question?.topic_id) return "-";
    return mockTopics.find((item) => String(item.id) === String(question.topic_id))?.name ?? "-";
  }, [question?.topic_id]);

  return (
    <QuestionBankLayout
      title="Question Preview"
      description="Review question details and metadata before publishing."
      actions={
        <div className="flex flex-wrap gap-2">
          {permissions.canEdit && question && (
            <button
              onClick={() => navigate(`/question-bank/${question.id}/edit`)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Edit Question
            </button>
          )}
          {permissions.canDelete && question && (
            <button
              onClick={() => navigate(`/question-bank/${question.id}/delete`)}
              className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
            >
              Delete
            </button>
          )}
        </div>
      }
    >
      {dataSource === "mock" && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Using demo data. Connect the Question Bank API to see live questions.
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading question...
        </div>
      ) : question ? (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <QuestionPreview question={question} showAnswer={permissions.canViewAnswer} />
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Metadata</h3>
            <dl className="mt-4 space-y-3 text-sm text-slate-600">
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-400">Status</dt>
                <dd className="text-sm">{question.status.toUpperCase()}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-400">Subject</dt>
                <dd className="text-sm">{subjectName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-400">Chapter</dt>
                <dd className="text-sm">{chapterName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-400">Topic</dt>
                <dd className="text-sm">{topicName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-400">Created By</dt>
                <dd className="text-sm">{question.created_by ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-400">Created At</dt>
                <dd className="text-sm">
                  {question.created_at
                    ? new Date(question.created_at).toLocaleString()
                    : "-"}
                </dd>
              </div>
              {question.review_note && (
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-400">Review Note</dt>
                  <dd className="text-sm text-rose-600">{question.review_note}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Question not found.
        </div>
      )}
    </QuestionBankLayout>
  );
}
