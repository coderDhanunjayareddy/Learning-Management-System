import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QuestionForm from '@/features/questions/components/QuestionForm';
import {
  fetchChapters,
  fetchQuestionById,
  fetchSubjects,
  fetchTopics,
  updateQuestion,
} from '@/features/questions/api/questionsApi';
import type { Question } from '@/features/questions/types';

export default function QuestionEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const questionId = Number(id);

  const [subjects, setSubjects] = useState<Array<{ id: number; name: string }>>([]);
  const [chapters, setChapters] = useState<Array<{ id: number; name: string }>>([]);
  const [topics, setTopics] = useState<Array<{ id: number; name: string }>>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    Promise.all([fetchSubjects(), fetchQuestionById(questionId)])
      .then(([subjectList, questionData]) => {
        if (!isMounted) return;
        setSubjects(Array.isArray(subjectList) ? subjectList : []);
        setQuestion(questionData);
        if (questionData.subject_id) {
          fetchChapters(questionData.subject_id)
            .then((data) => setChapters(Array.isArray(data) ? data : []))
            .catch(() => setChapters([]));
        }
        if (questionData.chapter_id) {
          fetchTopics(questionData.chapter_id)
            .then((data) => setTopics(Array.isArray(data) ? data : []))
            .catch(() => setTopics([]));
        }
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

  const handleSubjectChange = (subjectId: number | null) => {
    if (!subjectId) {
      setChapters([]);
      setTopics([]);
      return;
    }
    fetchChapters(subjectId)
      .then((data) => setChapters(Array.isArray(data) ? data : []))
      .catch(() => setChapters([]));
  };

  const handleChapterChange = (chapterId: number | null) => {
    if (!chapterId) {
      setTopics([]);
      return;
    }
    fetchTopics(chapterId)
      .then((data) => setTopics(Array.isArray(data) ? data : []))
      .catch(() => setTopics([]));
  };

  const handleSubmit = async (payload: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateQuestion(questionId, payload);
      navigate(`/questions/${updated.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update question');
    } finally {
      setSaving(false);
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Question</h1>
          <p className="text-sm text-gray-600">Update question details.</p>
        </div>
        <button
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          onClick={() => navigate('/questions')}
        >
          Back to list
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      <QuestionForm
        initialQuestion={question}
        subjects={subjects}
        chapters={chapters}
        topics={topics}
        onSubjectChange={handleSubjectChange}
        onChapterChange={handleChapterChange}
        onSubmit={handleSubmit}
        submitLabel={saving ? 'Saving...' : 'Save Changes'}
        disabled={saving}
      />
    </div>
  );
}
