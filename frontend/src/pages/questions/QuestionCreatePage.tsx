import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import QuestionBankLayout from "@/features/question-bank/components/QuestionBankLayout";
import QuestionForm from "@/features/question-bank/components/QuestionForm";
import { mockChapters, mockSubjects, mockTopics } from "@/features/question-bank/data/mockQuestions";
import type { CurriculumItem, Question } from "@/types/questionBank";
import { useAuth } from "@/features/auth/hooks/useAuth";

const normalizeQuestion = (item: any): Question => ({
  id: item.id ?? item.question_id ?? `${Math.random()}`,
  question_type: item.question_type ?? "mcq_single",
  question_text: item.question_text?.html ?? item.question_text?.text ?? item.question_text ?? "",
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
  const { user } = useAuth();

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

  const handleSave = async (payload: Omit<Question, "id">) => {
    try {
      const res = await api.post("/questions", payload);
      if (res.data) {
        const created = normalizeQuestion(res.data);
        navigate("/question-bank", { state: { createdQuestion: created } });
        return;
      }
    } catch (error) {
      // fallback to local state
    }

    const created: Question = {
      ...payload,
      id: Date.now(),
      status: "draft",
      created_at: new Date().toISOString(),
      created_by: user?.full_name || "You",
    };
    navigate("/question-bank", { state: { createdQuestion: created } });
  };

  return (
    <QuestionBankLayout
      title="Create Question"
      description="Compose a new question for your assessment library."
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
