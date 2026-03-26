import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { approveQuestion, fetchQuestionById, rejectQuestion } from '@/features/questions/api/questionsApi';
import QuestionRenderer from '@/components/questions/QuestionRenderer';
import type { Question } from '@/features/questions/types';
import { useAuth } from '@/app/providers/AuthProvider';
import { isAdminRole } from '@/features/auth/types';

export default function QuestionDetailPage() {
  const { id } = useParams();
  const questionId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchQuestionById(questionId)
      .then((data) => {
        if (!isMounted) return;
        setQuestion(data);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setError(err?.response?.data?.error || 'Failed to load question');
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [questionId]);

  const handleApprove = async () => {
    if (!question) return;
    setActionLoading(true);
    setError(null);
    try {
      const updated = await approveQuestion(question.id);
      setQuestion(updated);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to approve question');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!question) return;
    if (!rejectReason.trim()) {
      setError('Please provide a rejection reason.');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const updated = await rejectQuestion(question.id, rejectReason.trim());
      setQuestion(updated);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to reject question');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="rounded-md border border-gray-200 bg-white p-6 text-sm text-gray-600">
          Loading question...
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="rounded-md border border-gray-200 bg-white p-6 text-sm text-gray-600">
          Question not found.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Question Details</h1>
          <p className="text-sm text-gray-600">Review the question content and status.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            onClick={() => navigate('/questions')}
          >
            Back to list
          </button>
          <button
            className="rounded-md border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            onClick={() => navigate(`/questions/${question.id}/edit`)}
          >
            Edit
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <span className="text-xs font-semibold text-gray-500">Type</span>
            <p className="text-sm text-gray-900">{question.question_type}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500">Difficulty</span>
            <p className="text-sm text-gray-900">{question.difficulty_level}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500">Status</span>
            <p className="text-sm text-gray-900">{question.status}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500">Marks</span>
            <p className="text-sm text-gray-900">
              +{question.marks_positive} / -{question.marks_negative}
            </p>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500">Subject ID</span>
            <p className="text-sm text-gray-900">{question.subject_id}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500">Chapter ID</span>
            <p className="text-sm text-gray-900">{question.chapter_id}</p>
          </div>
          {question.topic_id ? (
            <div>
              <span className="text-xs font-semibold text-gray-500">Topic ID</span>
              <p className="text-sm text-gray-900">{question.topic_id}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-6">
          <span className="text-xs font-semibold text-gray-500">Question Content</span>
          <QuestionRenderer
            question={question}
            showMeta={false}
            showSolution
            className="mt-2"
          />
        </div>

        {question.rejection_reason ? (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <strong>Rejection Reason:</strong> {question.rejection_reason}
          </div>
        ) : null}
      </div>

      {user && isAdminRole(user.role) ? (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Review Actions</h2>
          <p className="mt-1 text-xs text-gray-500">Approve or reject this question.</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              onClick={handleApprove}
              disabled={actionLoading}
            >
              Approve
            </button>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold text-gray-500">Rejection Reason</label>
            <textarea
              className="mt-1 min-h-20 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              disabled={actionLoading}
            />
            <button
              className="mt-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              onClick={handleReject}
              disabled={actionLoading}
            >
              Reject
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
