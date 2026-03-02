import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QuestionForm from '@/features/questions/components/QuestionForm';
import { createQuestion, fetchChapters, fetchSubjects, fetchTopics } from '@/features/questions/api/questionsApi';

export default function QuestionCreatePage() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Array<{ id: number; name: string }>>([]);
  const [chapters, setChapters] = useState<Array<{ id: number; name: string }>>([]);
  const [topics, setTopics] = useState<Array<{ id: number; name: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchSubjects()
      .then((data) => {
        if (!isMounted) return;
        setSubjects(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!isMounted) return;
        setSubjects([]);
      });
    return () => {
      isMounted = false;
    };
  }, []);

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
      const created = await createQuestion(payload);
      navigate(`/questions/${created.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create question');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Question</h1>
          <p className="text-sm text-gray-600">Add a new question to the bank.</p>
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
        subjects={subjects}
        chapters={chapters}
        topics={topics}
        onSubjectChange={handleSubjectChange}
        onChapterChange={handleChapterChange}
        onSubmit={handleSubmit}
        submitLabel={saving ? 'Saving...' : 'Create Question'}
        disabled={saving}
      />
    </div>
  );
}
