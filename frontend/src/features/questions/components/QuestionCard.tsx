import QuestionRenderer from '@/components/questions/QuestionRenderer';
import type { Question } from '../types';

type Props = {
  question: Question;
  onView?: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
};

const statusColor = (status: Question['status']) => {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-700';
    case 'rejected':
      return 'bg-red-100 text-red-700';
    case 'draft':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const typeLabel = (type: Question['question_type']) => {
  switch (type) {
    case 'mcq_single':
      return 'MCQ (Single)';
    case 'mcq_multiple':
      return 'MCQ (Multiple)';
    case 'true_false':
      return 'True/False';
    case 'numerical':
      return 'Numerical';
    default:
      return type;
  }
};

const difficultyLabel = (difficulty: Question['difficulty_level']) => {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
};

export default function QuestionCard({ question, onView, onEdit, onDelete }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
            {typeLabel(question.question_type)}
          </span>
          <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700">
            {difficultyLabel(question.difficulty_level)}
          </span>
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusColor(question.status)}`}>
            {question.status}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Subject #{question.subject_id}</span>
          <span>Chapter #{question.chapter_id}</span>
          {question.topic_id ? <span>Topic #{question.topic_id}</span> : null}
        </div>
      </div>

      <QuestionRenderer
        question={question}
        showMeta={false}
        showAnswer={false}
        showOptions={false}
        showComprehension={false}
        showEmptyState={false}
        contentClassName="mt-3 line-clamp-3 text-sm text-gray-800"
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500">
        <div className="flex items-center gap-3">
          <span>Marks: +{question.marks_positive}</span>
          <span>Negative: -{question.marks_negative}</span>
        </div>
        <div className="flex items-center gap-2">
          {onView ? (
            <button
              className="rounded-md border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              onClick={() => onView(question.id)}
            >
              View
            </button>
          ) : null}
          {onEdit ? (
            <button
              className="rounded-md border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
              onClick={() => onEdit(question.id)}
            >
              Edit
            </button>
          ) : null}
          {onDelete ? (
            <button
              className="rounded-md border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
              onClick={() => onDelete(question.id)}
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
