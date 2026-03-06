import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import api from "@/lib/api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { CurriculumItem, Question } from "@/types/questionBank";
import QuestionFilters, { type QuestionFiltersState } from "./QuestionFilters";
import QuestionCard from "./QuestionCard";
import { getQuestionPermissions } from "@/features/question-bank/utils/questionPermissions";
import { mockChapters, mockQuestions, mockSubjects, mockTopics } from "@/features/question-bank/data/mockQuestions";

const normalizeCurriculum = (items: any[]): CurriculumItem[] =>
  items
    .map((item) => ({
      id: item.id ?? item.subject_id ?? item.chapter_id ?? item.topic_id,
      name: item.name ?? item.title ?? item.subject_name ?? "Untitled",
      subject_id: item.subject_id ?? item.subjectId ?? null,
      chapter_id: item.chapter_id ?? item.chapterId ?? null,
    }))
    .filter((item) => item.id !== undefined && item.id !== null);

const resolveQuestionText = (value: any) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    return value.html ?? value.text ?? "";
  }
  return "";
};

const normalizeOptions = (options: any) => {
  if (!Array.isArray(options)) return [];
  return options.map((option, index) => {
    if (typeof option === "string") {
      return { id: `${index}`, text: option };
    }
    if (option && typeof option === "object") {
      return {
        id: String(option.id ?? index),
        text: option.text ?? option.label ?? option.value ?? "",
        is_correct: option.is_correct ?? option.isCorrect ?? option.correct ?? undefined,
      };
    }
    return { id: `${index}`, text: String(option ?? "") };
  });
};

const normalizeQuestions = (items: any[]): Question[] =>
  items.map((item) => ({
    id: item.id ?? item.question_id ?? `${Math.random()}`,
    question_type: item.question_type ?? "mcq_single",
    question_text: resolveQuestionText(item.question_text),
    options: normalizeOptions(item.options),
    correct_answer: item.correct_answer ?? null,
    subject_id: item.subject_id ?? null,
    chapter_id: item.chapter_id ?? null,
    topic_id: item.topic_id ?? null,
    difficulty_level: item.difficulty_level ?? "easy",
    marks_positive: Number(item.marks_positive ?? 4),
    marks_negative: Number(item.marks_negative ?? 1),
    exam_tags: item.exam_tags ?? [],
    status: item.status ?? "draft",
    created_by:
      item.created_by_name ??
      (item.created_by !== undefined && item.created_by !== null ? String(item.created_by) : "Unknown"),
    created_at: item.created_at ?? null,
    review_note: item.review_note ?? item.rejection_reason ?? null,
  }));

export default function QuestionBankList({ filtersPlacement = "sidebar" }: { filtersPlacement?: "content" | "sidebar" }) {
  const { user } = useAuth();
  const permissions = getQuestionPermissions(user?.role);
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarHost, setSidebarHost] = useState<Element | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<"api" | "mock">("api");

  const [subjects, setSubjects] = useState<CurriculumItem[]>(mockSubjects);
  const [chapters, setChapters] = useState<CurriculumItem[]>(mockChapters);
  const [topics, setTopics] = useState<CurriculumItem[]>(mockTopics);

  const [filters, setFilters] = useState<QuestionFiltersState>({
    search: "",
    subjectId: "",
    chapterId: "",
    topicId: "",
    difficulty: "",
    type: "",
    status: "",
  });

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectQuestion, setRejectQuestion] = useState<Question | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;
  const [total, setTotal] = useState(0);

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

  useEffect(() => {
    let isMounted = true;
    const loadQuestions = async () => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = {
          page: currentPage,
          page_size: pageSize,
        };
        if (filters.search.trim()) params.q = filters.search.trim();
        if (filters.subjectId) params.subject_id = filters.subjectId;
        if (filters.chapterId) params.chapter_id = filters.chapterId;
        if (filters.topicId) params.topic_id = filters.topicId;
        if (filters.difficulty) params.difficulty_level = filters.difficulty;
        if (filters.type) params.question_type = filters.type;
        if (filters.status) params.status = filters.status;

        const res = await api.get("/questions", { params });
        const payload = Array.isArray(res.data?.data) ? res.data.data : [];
        if (!isMounted) return;
        setQuestions(normalizeQuestions(payload));
        setTotal(Number(res.data?.total ?? payload.length));
        setDataSource("api");
      } catch (error) {
        if (!isMounted) return;
        setQuestions(mockQuestions);
        setTotal(mockQuestions.length);
        setDataSource("mock");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadQuestions();
    return () => {
      isMounted = false;
    };
  }, [filters, currentPage, pageSize]);

  useEffect(() => {
    let isMounted = true;
    const loadChapters = async () => {
      if (!filters.subjectId) {
        if (isMounted) {
          setChapters([]);
          setTopics([]);
        }
        return;
      }
      try {
        const res = await api.get(`/subjects/${filters.subjectId}/chapters`);
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        if (!isMounted) return;
        setChapters(normalizeCurriculum(payload));
      } catch (error) {
        if (!isMounted) return;
        setChapters(
          mockChapters.filter((chapter) => String(chapter.subject_id) === String(filters.subjectId))
        );
      }
    };

    loadChapters();
    return () => {
      isMounted = false;
    };
  }, [filters.subjectId]);

  useEffect(() => {
    let isMounted = true;
    const loadTopics = async () => {
      if (!filters.chapterId) {
        if (isMounted) setTopics([]);
        return;
      }
      try {
        const res = await api.get(`/chapters/${filters.chapterId}/topics`);
        const payload = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
        if (!isMounted) return;
        setTopics(normalizeCurriculum(payload));
      } catch (error) {
        if (!isMounted) return;
        setTopics(
          mockTopics.filter((topic) => String(topic.chapter_id) === String(filters.chapterId))
        );
      }
    };

    loadTopics();
    return () => {
      isMounted = false;
    };
  }, [filters.chapterId]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    setSidebarHost(document.getElementById("question-bank-sidebar-slot"));
  }, []);

  useEffect(() => {
    const state = location.state as
      | {
        createdQuestion?: Question;
        updatedQuestion?: Question;
        deletedQuestionId?: string | number;
      }
      | null;
    if (!state) return;

    if (state.createdQuestion) {
      setQuestions((prev) => [state.createdQuestion as Question, ...prev]);
    }
    if (state.updatedQuestion) {
      setQuestions((prev) =>
        prev.map((item) =>
          String(item.id) === String(state.updatedQuestion?.id)
            ? (state.updatedQuestion as Question)
            : item
        )
      );
    }
    if (state.deletedQuestionId) {
      setQuestions((prev) =>
        prev.filter((item) => String(item.id) !== String(state.deletedQuestionId))
      );
    }

    navigate(location.pathname, { replace: true });
  }, [location.pathname, location.state, navigate]);

  const availableChapters = useMemo(
    () =>
      chapters.filter(
        (chapter) => !filters.subjectId || String(chapter.subject_id) === filters.subjectId
      ),
    [chapters, filters.subjectId]
  );

  const availableTopics = useMemo(
    () =>
      topics.filter(
        (topic) => !filters.chapterId || String(topic.chapter_id) === filters.chapterId
      ),
    [topics, filters.chapterId]
  );

  const filteredQuestions = useMemo(() => {
    if (dataSource === "api") return questions;
    const query = filters.search.trim().toLowerCase();
    return questions
      .filter((question) => {
        if (filters.subjectId && String(question.subject_id) !== filters.subjectId) return false;
        if (filters.chapterId && String(question.chapter_id) !== filters.chapterId) return false;
        if (filters.topicId && String(question.topic_id) !== filters.topicId) return false;
        if (filters.difficulty && question.difficulty_level !== filters.difficulty) return false;
        if (filters.type && question.question_type !== filters.type) return false;
        if (filters.status && question.status !== filters.status) return false;
        if (!query) return true;
        const tags = question.exam_tags?.join(" ").toLowerCase() ?? "";
        const author = question.created_by?.toLowerCase() ?? "";
        return (
          question.question_text.toLowerCase().includes(query) ||
          tags.includes(query) ||
          author.includes(query)
        );
      })
      .sort((a, b) => {
        const aNum = Number(a.id);
        const bNum = Number(b.id);
        if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
          return aNum - bNum;
        }
        return String(a.id).localeCompare(String(b.id));
      });
  }, [dataSource, filters, questions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const totalCount = dataSource === "api" ? total : filteredQuestions.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedQuestions =
    dataSource === "api"
      ? questions
      : filteredQuestions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleApprove = async (question: Question) => {
    if (dataSource === "api") {
      try {
        await api.post(`/questions/${question.id}/approve`);
      } catch (error) {
        setDataSource("mock");
      }
    }
    setQuestions((prev) =>
      prev.map((item) =>
        item.id === question.id ? { ...item, status: "approved", review_note: null } : item
      )
    );
  };

  const handleReject = (question: Question) => {
    setRejectQuestion(question);
    setRejectReason(question.review_note ?? "");
    setRejectModalOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectQuestion) return;
    if (dataSource === "api") {
      try {
        const reason = rejectReason.trim() || "Rejected";
        await api.post(`/questions/${rejectQuestion.id}/reject`, { reason });
      } catch (error) {
        setDataSource("mock");
      }
    }
    setQuestions((prev) =>
      prev.map((item) =>
        item.id === rejectQuestion.id
          ? { ...item, status: "rejected", review_note: rejectReason || "Rejected" }
          : item
      )
    );
    setRejectModalOpen(false);
  };

  const handleView = (question: Question) => {
    navigate(`/question-bank/${question.id}`, { state: { question } });
  };

  const filtersPanel = (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        Filters
      </div>
      <QuestionFilters
        layout="vertical"
        filters={filters}
        subjects={subjects}
        chapters={availableChapters}
        topics={availableTopics}
        onChange={setFilters}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {dataSource === "mock" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Using demo data. Connect the Question Bank API to see live questions.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Question Library</h2>
          <p className="text-sm text-slate-500">
            {totalCount} questions found
          </p>
        </div>
      </div>

      {!permissions.canCreate && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          You have read-only access to the question bank. Contact an administrator to request edit
          permissions.
        </div>
      )}

      {filtersPlacement !== "sidebar" || !sidebarHost ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <QuestionFilters
            filters={filters}
            subjects={subjects}
            chapters={availableChapters}
            topics={availableTopics}
            onChange={setFilters}
          />
        </div>
      ) : (
        createPortal(filtersPanel, sidebarHost)
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Loading questions...
        </div>
      ) : paginatedQuestions.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No questions match the current filters.
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedQuestions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              permissions={permissions}
              onView={handleView}
              onEdit={(item) => navigate(`/question-bank/${item.id}/edit`)}
              onDelete={(item) => navigate(`/question-bank/${item.id}/delete`)}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500">
              Showing {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}-
              {totalCount === 0
                ? 0
                : Math.min(currentPage * pageSize, totalCount)}{" "}
              of {totalCount}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }).map((_, index) => {
                const page = index + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${page === currentPage
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Reject Question</h3>
            <p className="text-xs text-slate-500">
              Add a brief note to help the author improve the question.
            </p>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={4}
              className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              placeholder="Reason for rejection"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
