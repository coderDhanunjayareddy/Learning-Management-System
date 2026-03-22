import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  getAttemptRuntime,
  isRuntimePayloadRich,
  saveAttemptResponses,
} from "@/features/exam-runtime/api";
import type {
  AutosaveState,
  ExamAttemptRuntime,
  PaletteQuestionState,
  RuntimeQuestion,
  RuntimeResponse,
} from "@/features/exam-runtime/types";

const isQuestionAttempted = (answer: unknown) => {
  if (Array.isArray(answer)) return answer.length > 0;
  if (answer === null || answer === undefined) return false;
  if (typeof answer === "string") return answer.trim().length > 0;
  return true;
};

const normalizeResponseMap = (runtime: ExamAttemptRuntime) => {
  const answers: Record<number, unknown> = {};
  const reviews: Record<number, boolean> = {};
  const visited: Record<number, boolean> = {};

  runtime.responses.forEach((response) => {
    answers[response.question_id] = response.student_answer;
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
  const [omrLocked, setOmrLocked] = useState(false);

  const dirtyQuestionIdsRef = useRef<Set<number>>(new Set());
  const [autosaveTick, setAutosaveTick] = useState(0);

  const loadAttempt = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUnsupportedData(false);
    dirtyQuestionIdsRef.current = new Set();
    setRuntime(null);
    setCurrentQuestionId(null);
    setAnswersByQuestionId({});
    setReviewByQuestionId({});
    setVisitedByQuestionId({});
    setAutosaveState("idle");
    setAutosaveError(null);
    setRemainingSeconds(null);
    setSubmitRequested(false);
    setFocusWarning(false);

    if (!Number.isInteger(attemptId) || attemptId <= 0) {
      setLoading(false);
      setError("Invalid attempt id.");
      return;
    }

    try {
      const payload = await getAttemptRuntime(attemptId);
      if (!payload) {
        setRuntime(null);
        setUnsupportedData(true);
        return;
      }

      if (!isRuntimePayloadRich(payload)) {
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
        const message =
          err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to load exam attempt.";
        setError(String(message));
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

  const readOnly = Boolean(runtime?.is_read_only || runtime?.status !== "in_progress" || omrLocked || remainingSeconds === 0);

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

  const selectSection = useCallback(
    (sectionId: number) => {
      const targetQuestion = questions.find((question) => question.section_id === sectionId);
      if (!targetQuestion) return;
      setCurrentQuestionId(targetQuestion.id);
      markVisited(targetQuestion.id);
    },
    [questions, markVisited]
  );

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
      setAnswersByQuestionId((prev) => ({ ...prev, [questionId]: null }));
      queueAutosave(questionId);
      setAutosaveState("idle");
      setAutosaveError(null);
    },
    [queueAutosave, readOnly]
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
        const question = questionById.get(questionId)!;
        const answer = answersByQuestionId[questionId] ?? null;

        return {
          question_id: question.id,
          section_id: question.section_id,
          student_answer: answer,
          is_marked_for_review: Boolean(reviewByQuestionId[questionId]),
          is_attempted: isQuestionAttempted(answer),
        };
      });

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

  useEffect(() => {
    if (autosaveTick === 0 || readOnly) return;

    const timer = window.setTimeout(() => {
      void flushSave();
    }, 900);

    return () => {
      window.clearTimeout(timer);
    };
  }, [autosaveTick, flushSave, readOnly]);

  const saveAndNext = useCallback(async () => {
    if (!currentQuestionId) return;
    const success = await flushSave([currentQuestionId]);
    if (success) {
      goToNext();
    }
  }, [currentQuestionId, flushSave, goToNext]);

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
      const isAnswered = isQuestionAttempted(answersByQuestionId[question.id]);
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
    setQuestionAnswer,
    toggleQuestionReview,
    clearQuestionAnswer,
    goToPrevious,
    goToNext,
    saveAndNext,
    jumpToQuestion,
    selectSection,
    flushSave,
  };
};
