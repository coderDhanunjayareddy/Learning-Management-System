import QuestionRenderer from "@/components/questions/QuestionRenderer";
import type { Question } from "@/types/questionBank";

interface QuestionPreviewProps {
  question: Question;
  showAnswer?: boolean;
}

export default function QuestionPreview({ question, showAnswer = false }: QuestionPreviewProps) {
  return (
    <QuestionRenderer
      question={question}
      showAnswer={showAnswer}
      showMeta
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    />
  );
}
