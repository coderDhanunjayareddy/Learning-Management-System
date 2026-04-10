import { memo } from "react";
import QuestionRenderer from "@/components/questions/QuestionRenderer";
import InlineFillBlankQuestion, {
  getInlineBlankPlaceholderIds,
} from "@/features/exam-runtime/components/InlineFillBlankQuestion";
import {
  buildFillBlankAnswer,
  extractQuestionHtml,
  getBlankIds,
  normalizeFillBlankAnswer,
} from "@/features/exam-runtime/questionHelpers";
import type { RuntimeQuestion } from "@/features/exam-runtime/types";

interface QuestionPromptBlockProps {
  question: RuntimeQuestion;
  answer: unknown;
  readOnly: boolean;
  onAnswerChange: (value: unknown) => void;
}

function QuestionPromptBlock({
  question,
  answer,
  readOnly,
  onAnswerChange,
}: QuestionPromptBlockProps) {
  const questionHtml = extractQuestionHtml(question.question_text);
  const blankIds = getBlankIds(question);
  const placeholderIds = getInlineBlankPlaceholderIds(questionHtml);
  const orderedBlankIds = placeholderIds.length ? placeholderIds : blankIds;
  const fillBlankAnswer = normalizeFillBlankAnswer(answer, orderedBlankIds);
  const fillBlankValues = Object.fromEntries(
    fillBlankAnswer.blanks.map((item) => [item.id, item.value])
  );

  if (question.question_type === "fill_in_blank") {
    const hasPlaceholderMismatch =
      blankIds.length > 0 &&
      placeholderIds.length > 0 &&
      placeholderIds.some((id) => !blankIds.includes(id));

    if (
      !orderedBlankIds.length ||
      !questionHtml.includes("{{") ||
      hasPlaceholderMismatch
    ) {
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          This fill-in-the-blank question has invalid blank metadata.
        </div>
      );
    }

    return (
      <InlineFillBlankQuestion
        html={questionHtml}
        valuesByBlankId={fillBlankValues}
        readOnly={readOnly}
        onBlankChange={(blankId, value) => {
          onAnswerChange(
            buildFillBlankAnswer(answer, orderedBlankIds, blankId, value)
          );
        }}
      />
    );
  }

  return (
    <QuestionRenderer
      question={{
        question_type: question.question_type,
        question_text: question.question_text,
        options: [],
        comprehension: question.comprehension,
        marks_positive: question.marks_positive ?? undefined,
        marks_negative: question.marks_negative ?? undefined,
      }}
      showMeta={false}
      showOptions={false}
      showComprehension={true}
      showEmptyState={false}
      contentClassName="text-lg leading-relaxed text-slate-900 md:text-xl"
    />
  );
}

export default memo(QuestionPromptBlock, (prev, next) => {
  if (prev.question.question_type !== next.question.question_type) return false;
  if (prev.question.id !== next.question.id) return false;
  if (
    extractQuestionHtml(prev.question.question_text) !==
    extractQuestionHtml(next.question.question_text)
  ) {
    return false;
  }
  if (prev.question.marks_positive !== next.question.marks_positive) return false;
  if (prev.question.marks_negative !== next.question.marks_negative) return false;

  if (prev.question.question_type === "fill_in_blank") {
    return (
      prev.answer === next.answer &&
      prev.readOnly === next.readOnly
    );
  }

  return true;
});
