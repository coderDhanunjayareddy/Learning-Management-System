import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  getAttemptById,
  getAttemptResult,
  saveAttemptResponses,
  submitAttempt,
} from "@/features/exam-runtime/api";
import {
  emptyAnswerForQuestion,
  isQuestionAttemptedValue,
  normalizeAnswerForQuestion,
} from "@/features/exam-runtime/questionHelpers";
import type {
  AutosaveState,
  ExamAttemptRuntime,
  PaletteQuestionState,
  RuntimeQuestion,
  RuntimeResponse,
} from "@/features/exam-runtime/types";

const normalizeResponseMap = (runtime: ExamAttemptRuntime) => {
  const answers: Record<number, unknown> = {};
  const reviews: Record<number, boolean> = {};
  const visited: Record<number, boolean> = {};
  const questionById = new Map(runtime.questions.map((question) => [question.id, question]));

  runtime.responses.forEach((response) => {
    const question = questionById.get(response.question_id);
    answers[response.question_id] = question
      ? normalizeAnswerForQuestion(question, response.student_answer)
      : response.student_answer;
    reviews[response.question_id] = Boolean(response.is_marked_for_review);
    if (response.is_attempted || response.is_marked_for_review) {
      visited[response.question_id] = true;
    }
  });

  return { answers, reviews, visited };
};

interface UseExamRuntimeParams {
  attemptId: number;
}

interface SubmitOutcome {
  submitted: boolean;
  resultAvailable: boolean;
  attemptId: number | null;
  examId: number | null;
  message: string | null;
}

const defaultSubmitOutcome = (): SubmitOutcome => ({
  submitted: false,
  resultAvailable: false,
  attemptId: null,
  examId: null,
  message: null,
});

export const useExamRuntime = ({ attemptId }: UseExamRuntimeParams) => {
  const [runtime, setRuntime] = useState<ExamAttemptRuntime | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unsupportedData, setUnsupportedData] = useState(false);

  const [currentQuestionId, setCurrentQuestionId] = useState<number | null>(null);
  const [answersByQuestionId, setAnswersByQuestionId] = useState<Record<number, unknown>>({});
  const [reviewByQuestionId, setReviewByQuestionId] = useState<Record<number, boolean>>({});
  const [visitedByQuestionId, setVisitedByQuestionId] = useState<Record<number, boolean>>({});

  const [autosaveState, setAutosaveState] = useState<AutosaveState>("idle");
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [focusWarning, setFocusWarning] = useState(false);
  const [submitRequested, setSubmitRequested] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastSubmitOutcome, setLastSubmitOutcome] = useState<SubmitOutcome | null>(null);
  const [omrLocked, setOmrLocked] = useState(false);

  const dirtyQuestionIdsRef = useRef<Set<number>>(new Set());
  const autoSubmitTriggeredRef = useRef(false);
  const [autosaveTick, setAutosaveTick] = useState(0);

  const loadAttempt = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUnsupportedData(false);
    dirtyQuestionIdsRef.current = new Set();
    autoSubmitTriggeredRef.current = false;
    setRuntime(null);
    setCurrentQuestionId(null);
    setAnswersByQuestionId({});
    setReviewByQuestionId({});
    setVisitedByQuestionId({});
    setAutosaveState("idle");
    setAutosaveError(null);
    setRemainingSeconds(null);
    setSubmitRequested(false);
    setSubmitLoading(false);
    setSubmitError(null);
    setLastSubmitOutcome(null);
    setFocusWarning(false);

    if (!Number.isInteger(attemptId) || attemptId <= 0) {
      setLoading(false);
      setError("Invalid attempt id.");
      return;
    }

    try {
      const payload = await getAttemptById(attemptId);
      if (!payload) {
        setRuntime(null);
        setUnsupportedData(true);
        return;
      }

      if (!payload.questions.length || !payload.sections.length) {
        setRuntime(payload);
        setUnsupportedData(true);
        return;
      }

      const initial = normalizeResponseMap(payload);
      const firstQuestionId = payload.questions[0]?.id ?? null;

      setRuntime(payload);
      setAnswersByQuestionId(initial.answers);
      setReviewByQuestionId(initial.reviews);
      setVisitedByQuestionId(() => {
        const next = { ...initial.visited };
        if (firstQuestionId) next[firstQuestionId] = true;
        return next;
      });
      setCurrentQuestionId(firstQuestionId);
      setRemainingSeconds(payload.remaining_seconds);
      setOmrLocked(Boolean(payload.attempt.omr_lock));
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401) {
          setError("Your session expired. Please login again.");
        } else if (status === 403) {
          setError(String(err.response?.data?.message ?? "You are not allowed to access this attempt."));
        } else if (status === 404) {
          setError("Exam attempt not found.");
        } else {
          const message =
            err.response?.data?.message ??
            err.response?.data?.error ??
            "Failed to load exam attempt.";
          setError(String(message));
        }
      } else {
        setError("Failed to load exam attempt.");
      }
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    void loadAttempt();
  }, [loadAttempt]);

  const questions = useMemo(() => runtime?.questions ?? [], [runtime]);
  const sections = useMemo(() => runtime?.sections ?? [], [runtime]);

  const questionById = useMemo(() => {
    const map = new Map<number, RuntimeQuestion>();
    questions.forEach((question) => map.set(question.id, question));
    return map;
  }, [questions]);

  const currentQuestionIndex = useMemo(() => {
    if (!currentQuestionId) return -1;
    return questions.findIndex((question) => question.id === currentQuestionId);
  }, [questions, currentQuestionId]);

  const currentQuestion = useMemo(() => {
    if (!currentQuestionId) return null;
    return questionById.get(currentQuestionId) ?? null;
  }, [currentQuestionId, questionById]);

  const currentSectionId = currentQuestion?.section_id ?? null;
  const currentSection = useMemo(() => {
    if (!currentSectionId) return null;
    return sections.find((section) => section.id === currentSectionId) ?? null;
  }, [sections, currentSectionId]);

  const readOnly = Boolean(
    runtime?.is_read_only || runtime?.status !== "in_progress" || omrLocked || remainingSeconds === 0
  );

  const queueAutosave = useCallback((questionId: number) => {
    dirtyQuestionIdsRef.current.add(questionId);
    setAutosaveTick((value) => value + 1);
  }, []);

  const markVisited = useCallback((questionId: number) => {
    setVisitedByQuestionId((prev) => ({ ...prev, [questionId]: true }));
  }, []);

  const jumpToQuestion = useCallback(
    (questionId: number) => {
      if (!questionById.has(questionId)) return;
      setCurrentQuestionId(questionId);
      markVisited(questionId);
      setPaletteOpen(false);
    },
    [questionById, markVisited]
  );

  const goToPrevious = useCallback(() => {
    if (currentQuestionIndex <= 0) return;
    const previous = questions[currentQuestionIndex - 1];
    if (!previous) return;
    setCurrentQuestionId(previous.id);
    markVisited(previous.id);
  }, [currentQuestionIndex, questions, markVisited]);

  const goToNext = useCallback(() => {
    if (currentQuestionIndex < 0 || currentQuestionIndex >= questions.length - 1) return;
    const next = questions[currentQuestionIndex + 1];
    if (!next) return;
    setCurrentQuestionId(next.id);
    markVisited(next.id);
  }, [currentQuestionIndex, questions, markVisited]);

  const setQuestionAnswer = useCallback(
    (questionId: number, value: unknown) => {
      if (readOnly) return;
      setAnswersByQuestionId((prev) => ({ ...prev, [questionId]: value }));
      markVisited(questionId);
      queueAutosave(questionId);
      setAutosaveState("idle");
      setAutosaveError(null);
    },
    [markVisited, queueAutosave, readOnly]
  );

  const toggleQuestionReview = useCallback(
    (questionId: number) => {
      if (readOnly) return;
      setReviewByQuestionId((prev) => {
        const nextValue = !prev[questionId];
        return { ...prev, [questionId]: nextValue };
      });
      markVisited(questionId);
      queueAutosave(questionId);
      setAutosaveState("idle");
      setAutosaveError(null);
    },
    [markVisited, queueAutosave, readOnly]
  );

  const clearQuestionAnswer = useCallback(
    (questionId: number) => {
      if (readOnly) return;
      const question = questionById.get(questionId);
      setAnswersByQuestionId((prev) => ({
        ...prev,
        [questionId]: question ? emptyAnswerForQuestion(question) : null,
      }));
      markVisited(questionId);
      queueAutosave(questionId);
      setAutosaveState("idle");
      setAutosaveError(null);
    },
    [markVisited, questionById, queueAutosave, readOnly]
  );

  const flushSave = useCallback(
    async (questionIds?: number[]) => {
      if (!runtime || readOnly) return true;

      const ids = questionIds?.length
        ? questionIds
        : Array.from(dirtyQuestionIdsRef.current.values());
      const uniqueIds = [...new Set(ids)].filter((id) => questionById.has(id));
      if (uniqueIds.length === 0) return true;

      const payload: RuntimeResponse[] = uniqueIds.map((questionId) => {
        const question = questionById.get(questionId);
        const answer = answersByQuestionId[questionId] ?? null;

        return {
          question_id: question ? question.id : questionId,
          section_id: question ? question.section_id : 0,
          student_answer: answer,
          is_marked_for_review: Boolean(reviewByQuestionId[questionId]),
          is_attempted: isQuestionAttemptedValue(answer),
        };
      }).filter((item) => item.section_id > 0);

      if (payload.length === 0) return true;

      setAutosaveState("saving");
      setAutosaveError(null);

      try {
        const nextRuntime = await saveAttemptResponses(runtime.attempt.id, payload, omrLocked);
        if (nextRuntime) {
          setRuntime(nextRuntime);
          setRemainingSeconds(nextRuntime.remaining_seconds);
          setOmrLocked(Boolean(nextRuntime.attempt.omr_lock));
        }

        uniqueIds.forEach((questionId) => dirtyQuestionIdsRef.current.delete(questionId));
        setAutosaveState("saved");
        return true;
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.status === 423) {
          setOmrLocked(true);
          setAutosaveError("Answers are locked by OMR mode.");
        } else if (axios.isAxiosError(err)) {
          const message =
            err.response?.data?.message ||
            err.response?.data?.error ||
            "Autosave failed.";
          setAutosaveError(String(message));
        } else {
          setAutosaveError("Autosave failed.");
        }
        setAutosaveState("error");
        return false;
      }
    },
    [runtime, readOnly, questionById, answersByQuestionId, reviewByQuestionId, omrLocked]
  );

  const selectSection = useCallback(
    async (sectionId: number) => {
      const targetQuestion = questions.find((question) => question.section_id === sectionId);
      if (!targetQuestion) return;

      if (!readOnly && dirtyQuestionIdsRef.current.size > 0) {
        const pending = Array.from(dirtyQuestionIdsRef.current.values());
        const saved = await flushSave(pending);
        if (!saved) return;
      }

      setCurrentQuestionId(targetQuestion.id);
      markVisited(targetQuestion.id);
    },
    [flushSave, markVisited, questions, readOnly]
  );

  useEffect(() => {
    if (autosaveTick === 0 || readOnly) return;

    const timer = window.setTimeout(() => {
      void flushSave();
    }, 900);

    return () => {
      window.clearTimeout(timer);
    };
  }, [autosaveTick, flushSave, readOnly]);

  useEffect(() => {
    if (readOnly) return;

    const timer = window.setInterval(() => {
      if (dirtyQuestionIdsRef.current.size === 0) return;
      void flushSave();
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, [flushSave, readOnly]);

  const saveAndNext = useCallback(async () => {
    if (!currentQuestionId) return;
    const success = await flushSave([currentQuestionId]);
    if (success) {
      goToNext();
    }
  }, [currentQuestionId, flushSave, goToNext]);

  const markForReviewAndNext = useCallback(async () => {
    if (!currentQuestionId || readOnly) return;

    setReviewByQuestionId((prev) => ({ ...prev, [currentQuestionId]: true }));
    markVisited(currentQuestionId);
    queueAutosave(currentQuestionId);
    setAutosaveState("idle");
    setAutosaveError(null);

    const success = await flushSave([currentQuestionId]);
    if (success) {
      goToNext();
    }
  }, [currentQuestionId, flushSave, goToNext, markVisited, queueAutosave, readOnly]);

  const clearResponseAndSave = useCallback(
    async (questionId: number) => {
      if (readOnly) return false;
      const question = questionById.get(questionId);
      setAnswersByQuestionId((prev) => ({
        ...prev,
        [questionId]: question ? emptyAnswerForQuestion(question) : null,
      }));
      markVisited(questionId);
      queueAutosave(questionId);
      setAutosaveState("idle");
      setAutosaveError(null);
      return flushSave([questionId]);
    },
    [flushSave, markVisited, questionById, queueAutosave, readOnly]
  );

  const submitCurrentAttempt = useCallback(async (): Promise<SubmitOutcome> => {
    if (!runtime || submitLoading) {
      const outcome = defaultSubmitOutcome();
      setLastSubmitOutcome(outcome);
      return outcome;
    }

    const pending = Array.from(dirtyQuestionIdsRef.current.values());
    if (pending.length > 0) {
      const saved = await flushSave(pending);
      if (!saved) {
        const outcome: SubmitOutcome = {
          ...defaultSubmitOutcome(),
          attemptId: runtime.attempt.id,
          examId: runtime.exam.id,
          message: "Please resolve save errors before submitting.",
        };
        setLastSubmitOutcome(outcome);
        return outcome;
      }
    }

    setSubmitLoading(true);
    setSubmitError(null);

    try {
      const submitResult = await submitAttempt(runtime.attempt.id);
      const nextStatus = String(submitResult.attempt.status ?? "submitted");

      setRuntime((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          attempt: {
            ...prev.attempt,
            status: nextStatus,
            submitted_at: submitResult.attempt.submitted_at ?? prev.attempt.submitted_at ?? null,
            auto_submitted: submitResult.attempt.auto_submitted ?? prev.attempt.auto_submitted ?? null,
          },
          status: nextStatus,
          is_read_only: true,
        };
      });
      setRemainingSeconds((prev) => (prev === null ? null : 0));
      setSubmitRequested(false);
      dirtyQuestionIdsRef.current.clear();

      let resultAvailable = false;
      try {
        await getAttemptResult(runtime.attempt.id);
        resultAvailable = true;
      } catch (resultErr: unknown) {
        if (axios.isAxiosError(resultErr)) {
          const status = resultErr.response?.status;
          if (status === 401) {
            setSubmitError("Session expired while checking result visibility.");
          }
        }
      }

      const outcome: SubmitOutcome = {
        submitted: true,
        resultAvailable,
        attemptId: runtime.attempt.id,
        examId: runtime.exam.id,
        message: submitResult.message,
      };
      setLastSubmitOutcome(outcome);
      return outcome;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message =
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to submit exam.";
        setSubmitError(String(message));

        if (err.response?.status === 409) {
          void loadAttempt();
        }
      } else {
        setSubmitError("Failed to submit exam.");
      }

      const outcome: SubmitOutcome = {
        ...defaultSubmitOutcome(),
        attemptId: runtime.attempt.id,
        examId: runtime.exam.id,
      };
      setLastSubmitOutcome(outcome);
      return outcome;
    } finally {
      setSubmitLoading(false);
    }
  }, [flushSave, loadAttempt, runtime, submitLoading]);

  useEffect(() => {
    if (remainingSeconds === null) return;
    if (remainingSeconds <= 0) return;
    if (runtime?.status !== "in_progress") return;

    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null) return null;
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [remainingSeconds, runtime?.status]);

  useEffect(() => {
    if (remainingSeconds !== 0) return;
    if (!runtime || runtime.status !== "in_progress") return;
    if (submitLoading || autoSubmitTriggeredRef.current) return;

    autoSubmitTriggeredRef.current = true;
    void submitCurrentAttempt().then((result) => {
      if (!result.submitted) {
        autoSubmitTriggeredRef.current = false;
      }
    });
  }, [remainingSeconds, runtime, submitLoading, submitCurrentAttempt]);

  useEffect(() => {
    const wasHiddenRef = { current: false };
    const wasBlurredRef = { current: false };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        wasHiddenRef.current = true;
        if (currentQuestionId) {
          void flushSave([currentQuestionId]);
        }
      } else if (wasHiddenRef.current) {
        setFocusWarning(true);
        wasHiddenRef.current = false;
      }
    };

    const handleBlur = () => {
      wasBlurredRef.current = true;
    };

    const handleFocus = () => {
      if (wasBlurredRef.current) {
        setFocusWarning(true);
        wasBlurredRef.current = false;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [currentQuestionId, flushSave]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase() || "";
      const isEditableTarget = tag === "input" || tag === "textarea" || target?.isContentEditable;
      if (isEditableTarget) return;

      if (event.altKey && event.key === "ArrowRight") {
        event.preventDefault();
        void saveAndNext();
      }

      if (event.altKey && event.key === "ArrowLeft") {
        event.preventDefault();
        goToPrevious();
      }

      if (event.altKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goToPrevious, saveAndNext]);

  const paletteStateByQuestionId = useMemo(() => {
    const map: Record<number, PaletteQuestionState> = {};

    questions.forEach((question) => {
      const hasReview = Boolean(reviewByQuestionId[question.id]);
      const isAnswered = isQuestionAttemptedValue(answersByQuestionId[question.id]);
      const isVisited = Boolean(visitedByQuestionId[question.id]);

      if (hasReview && isAnswered) {
        map[question.id] = "answered_review";
      } else if (hasReview) {
        map[question.id] = "review";
      } else if (isAnswered) {
        map[question.id] = "answered";
      } else if (isVisited) {
        map[question.id] = "visited";
      } else {
        map[question.id] = "not_visited";
      }
    });

    return map;
  }, [questions, reviewByQuestionId, answersByQuestionId, visitedByQuestionId]);

  return {
    runtime,
    loading,
    error,
    unsupportedData,
    loadAttempt,
    questions,
    sections,
    currentQuestion,
    currentQuestionId,
    currentQuestionIndex,
    currentSection,
    currentSectionId,
    readOnly,
    answersByQuestionId,
    reviewByQuestionId,
    paletteStateByQuestionId,
    autosaveState,
    autosaveError,
    remainingSeconds,
    paletteOpen,
    setPaletteOpen,
    focusWarning,
    setFocusWarning,
    submitRequested,
    setSubmitRequested,
    submitLoading,
    submitError,
    lastSubmitOutcome,
    setSubmitError,
    setQuestionAnswer,
    toggleQuestionReview,
    clearQuestionAnswer,
    goToPrevious,
    goToNext,
    saveAndNext,
    markForReviewAndNext,
    clearResponseAndSave,
    jumpToQuestion,
    selectSection,
    flushSave,
    submitCurrentAttempt,
  };
};
