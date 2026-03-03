import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QuestionCard from '@/features/questions/components/QuestionCard';
import FilterSidebar from '@/features/questions/components/FilterSidebar';
import Pagination from '@/components/ui/Pagination';
import { fetchChapters, fetchQuestions, fetchSubjects, fetchTopics } from '@/features/questions/api/questionsApi';
import type { Question, QuestionFilters } from '@/features/questions/types';
import api from '@/lib/api';

export default function QuestionListPage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filters, setFilters] = useState<QuestionFilters>({});
  const [subjects, setSubjects] = useState<Array<{ id: number; name: string }>>([]);
  const [chapters, setChapters] = useState<Array<{ id: number; name: string }>>([]);
  const [topics, setTopics] = useState<Array<{ id: number; name: string }>>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const normalizedFilters = useMemo(() => {
    const cleaned: QuestionFilters = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        cleaned[key as keyof QuestionFilters] = value as QuestionFilters[keyof QuestionFilters];
      }
    });
    return cleaned;
  }, [filters]);

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

  useEffect(() => {
    const subjectId = filters.subject_id ? Number(filters.subject_id) : null;
    if (!subjectId) {
      setChapters([]);
      setTopics([]);
      return;
    }
    fetchChapters(subjectId)
      .then((data) => setChapters(Array.isArray(data) ? data : []))
      .catch(() => setChapters([]));
  }, [filters.subject_id]);

  useEffect(() => {
    const chapterId = filters.chapter_id ? Number(filters.chapter_id) : null;
    if (!chapterId) {
      setTopics([]);
      return;
    }
    fetchTopics(chapterId)
      .then((data) => setTopics(Array.isArray(data) ? data : []))
      .catch(() => setTopics([]));
  }, [filters.chapter_id]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchQuestions(normalizedFilters, page, pageSize)
      .then((response) => {
        if (!isMounted) return;
        setQuestions(response.data);
        setTotal(response.total);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err?.response?.data?.error || 'Failed to load questions');
        setQuestions([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [normalizedFilters, page, pageSize]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Archive this question?')) return;
    try {
      await api.delete(`/questions/${id}`);
      setQuestions((prev) => prev.filter((item) => item.id !== id));
      setTotal((prev) => Math.max(prev - 1, 0));
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to archive question');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
          <p className="text-sm text-gray-600">Search, filter, and manage questions across subjects.</p>
        </div>
        <button
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          onClick={() => navigate('/questions/new')}
        >
          Create Question
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <FilterSidebar
          filters={filters}
          subjects={subjects}
          chapters={chapters}
          topics={topics}
          onChange={(next) => {
            setPage(1);
            setFilters(next);
          }}
          onReset={() => {
            setPage(1);
            setFilters({});
          }}
        />

        <div className="space-y-4">
          {loading ? (
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
              Loading questions...
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
          ) : questions.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
              No questions found for the selected filters.
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  onView={(id) => navigate(`/questions/${id}`)}
                  onEdit={(id) => navigate(`/questions/${id}/edit`)}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
}
