import api from "@/lib/api";
import type { StudentExam } from "@/features/exams/types/studentExam";
import type {
  AttemptResultQuestionResponse,
  AttemptResultResponse,
  AttemptSubmitResponse,
  ExamAttemptRuntime,
  RuntimeOption,
  RuntimeQuestion,
  RuntimeResponse,
  RuntimeSection,
} from "@/features/exam-runtime/types";
import {
  getBlankIds,
  normalizeAnswerForQuestion,
  normalizeQuestionOptions,
} from "@/features/exam-runtime/questionHelpers";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const toNumber = (value: unknown, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const toNullableText = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    const source = asRecord(value);
    if (typeof source.html === "string") return source.html;
    if (typeof source.text === "string") return source.text;
    if (typeof source.label === "string") return source.label;
    if (typeof source.value === "string") return source.value;
  }
  return String(value);
};

const toBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }
  return fallback;
};

const normalizeSection = (item: unknown): RuntimeSection => {
  const source = asRecord(item);
  return {
    id: toNumber(source.id ?? source.section_id),
    title: String(source.title ?? source.section_title ?? "Section"),
    order_index: toNumber(source.order_index ?? source.section_order, 0),
    instructions:
      source.instructions === undefined
        ? toNullableText(source.section_instructions)
        : toNullableText(source.instructions),
    question_count: toNumber(source.question_count, 0),
  };
};

const normalizeQuestion = (item: unknown, index: number): RuntimeQuestion => {
  const source = asRecord(item);
  const question: RuntimeQuestion = {
    id: toNumber(source.id ?? source.question_id),
    question_id: toNumber(source.question_id ?? source.id),
    section_id: toNumber(source.section_id),
    section_order: toNumber(source.section_order, 0),
    section_title: String(source.section_title ?? "Section"),
    question_order: toNumber(source.question_order ?? source.order_index, index + 1),
    sequence: toNumber(source.sequence, index + 1),
    question_type: String(source.question_type ?? ""),
    question_text: (source.question_text as string | { html?: string | null } | null | undefined) ?? null,
    options: normalizeQuestionOptions(source.options, String(source.question_type ?? "")),
    blank_ids: Array.isArray(source.blank_ids)
      ? source.blank_ids.map((item) => String(item))
      : undefined,
    marks_positive: toNullableNumber(source.marks_positive),
    marks_negative: toNullableNumber(source.marks_negative),
  };

  question.blank_ids = getBlankIds(question);
  return question;
};

const normalizeResponses = (rows: unknown[], questions: RuntimeQuestion[]): RuntimeResponse[] => {
  const questionById = new Map(questions.map((question) => [question.id, question]));

  return rows.map((row) => {
    const source = asRecord(row);
    const questionId = toNumber(source.question_id);
    const question = questionById.get(questionId);
    return {
      id: toNullableNumber(source.id) ?? undefined,
      question_id: questionId,
      section_id: toNumber(source.section_id),
      student_answer: question ? normalizeAnswerForQuestion(question, source.student_answer) : source.student_answer ?? null,
      is_marked_for_review: toBoolean(source.is_marked_for_review),
      is_attempted: toBoolean(source.is_attempted),
      answered_at: (source.answered_at as string | null | undefined) ?? null,
    };
  });
};

const deriveSectionsFromQuestions = (questions: RuntimeQuestion[]): RuntimeSection[] => {
  const map = new Map<number, RuntimeSection>();

  questions.forEach((question) => {
    if (!map.has(question.section_id)) {
      map.set(question.section_id, {
        id: question.section_id,
        title: question.section_title || `Section ${question.section_id}`,
        order_index: question.section_order,
        question_count: 0,
      });
    }

    const section = map.get(question.section_id);
    if (!section) return;
    section.question_count += 1;
  });

  return Array.from(map.values()).sort((a, b) => {
    if (a.order_index === b.order_index) return a.id - b.id;
    return a.order_index - b.order_index;
  });
};

const unwrapArrayPayload = (data: unknown): unknown[] => {
  if (Array.isArray(data)) return data;
  const source = asRecord(data);
  if (Array.isArray(source.data)) return source.data;
  return [];
};

const toJsonSafe = (value: unknown): unknown => {
  if (value === undefined || value === null) return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonSafe(item));
  }

  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};
    Object.entries(source).forEach(([key, item]) => {
      if (item !== undefined) {
        normalized[key] = toJsonSafe(item);
      }
    });
    return normalized;
  }

  return String(value);
};

export const normalizeStudentExam = (item: unknown): StudentExam => {
  const source = asRecord(item);

  return {
    id: toNumber(source.id ?? source.exam_id, 0),
    title: String(source.title ?? source.name ?? "Untitled exam"),
    description: typeof source.description === "string" ? source.description : null,
    course_id: toNullableNumber(source.course_id),
    content_id: toNullableNumber(source.content_id),
    start_datetime:
      typeof source.start_datetime === "string"
        ? source.start_datetime
        : typeof source.startDate === "string"
          ? source.startDate
          : null,
    end_datetime:
      typeof source.end_datetime === "string"
        ? source.end_datetime
        : typeof source.endDate === "string"
          ? source.endDate
          : null,
    total_duration_minutes: toNullableNumber(
      source.total_duration_minutes ?? source.duration_minutes ?? source.duration
    ),
    computed_status: source.computed_status ? String(source.computed_status) : null,
    status: source.status ? String(source.status) : null,
    max_attempts: toNullableNumber(source.max_attempts),
    attempt_count: toNumber(source.attempt_count, 0),
    has_completed: toBoolean(source.has_completed),
    in_progress_attempt_id: toNullableNumber(source.in_progress_attempt_id),
    has_in_progress_attempt: toBoolean(source.has_in_progress_attempt),
    latest_completed_attempt_id: toNullableNumber(source.latest_completed_attempt_id),
    show_result_immediately: toBoolean(source.show_result_immediately, true),
    show_score: toBoolean(source.show_score, true),
    show_pass_or_fail: toBoolean(source.show_pass_or_fail, true),
    show_solutions_to_user: toBoolean(source.show_solutions_to_user, false),
  };
};

export const normalizeRuntimePayload = (raw: unknown): ExamAttemptRuntime | null => {
  const root = asRecord(raw);
  const source = asRecord(root.attemptState ?? raw);

  const attempt = asRecord(source.attempt);
  const exam = asRecord(source.exam);
  if (!attempt.id || !exam.id) return null;

  const attemptId = toNullableNumber(attempt.id);
  const examId = toNullableNumber(exam.id ?? attempt.exam_id);
  if (!attemptId || !examId) return null;

  const questionsRaw = Array.isArray(source.questions) ? source.questions : [];
  const questions = questionsRaw
    .map(normalizeQuestion)
    .filter((question) => question.id > 0 && question.section_id > 0);

  const sectionsRaw = Array.isArray(source.sections) ? source.sections : [];
  const sections = (sectionsRaw.length ? sectionsRaw.map(normalizeSection) : deriveSectionsFromQuestions(questions)).filter(
    (section) => section.id > 0
  );

  const responsesRaw = Array.isArray(source.responses) ? source.responses : [];
  const status = String(source.status ?? attempt.status ?? "in_progress");

  return {
    attempt: {
      id: attemptId,
      exam_id: toNumber(attempt.exam_id ?? examId),
      student_id: toNumber(attempt.student_id),
      attempt_number: toNumber(attempt.attempt_number, 1),
      started_at: String(attempt.started_at ?? ""),
      submitted_at: (attempt.submitted_at as string | null | undefined) ?? null,
      status,
      omr_lock: (attempt.omr_lock as boolean | null | undefined) ?? null,
      auto_submitted: (attempt.auto_submitted as boolean | null | undefined) ?? null,
    },
    exam: {
      id: examId,
      title: String(exam.title ?? "Exam"),
      course_id: toNullableNumber(exam.course_id),
      content_id: toNullableNumber(exam.content_id),
      instructions: toNullableText(exam.instructions),
      total_duration_minutes: toNullableNumber(exam.total_duration_minutes),
      start_datetime: (exam.start_datetime as string | null | undefined) ?? null,
      end_datetime: (exam.end_datetime as string | null | undefined) ?? null,
      show_result_immediately: toBoolean(exam.show_result_immediately, true),
      show_score: toBoolean(exam.show_score, true),
      show_pass_or_fail: toBoolean(exam.show_pass_or_fail, true),
      show_solutions_to_user: toBoolean(exam.show_solutions_to_user, false),
    },
    sections,
    questions,
    responses: normalizeResponses(responsesRaw, questions),
    remaining_seconds: toNullableNumber(source.remaining_seconds),
    status,
    is_read_only: toBoolean(source.is_read_only, status === "submitted" || status === "graded"),
  };
};

const normalizeSubmitResponse = (raw: unknown): AttemptSubmitResponse => {
  const source = asRecord(raw);
  const attempt = asRecord(source.attempt);

  return {
    message: String(source.message ?? "Submitted"),
    attempt: {
      id: toNumber(attempt.id),
      exam_id: toNumber(attempt.exam_id),
      student_id: toNumber(attempt.student_id),
      attempt_number: toNumber(attempt.attempt_number, 1),
      status: String(attempt.status ?? "submitted"),
      submitted_at: (attempt.submitted_at as string | null | undefined) ?? null,
      auto_submitted: attempt.auto_submitted === undefined ? null : toBoolean(attempt.auto_submitted),
      total_score: toNullableNumber(attempt.total_score),
      total_correct: toNullableNumber(attempt.total_correct),
      total_wrong: toNullableNumber(attempt.total_wrong),
      total_unattempted: toNullableNumber(attempt.total_unattempted),
    },
  };
};

const normalizeAttemptResultResponse = (raw: unknown): AttemptResultResponse => {
  const source = asRecord(raw);
  const attempt = asRecord(source.attempt);
  const exam = asRecord(source.exam);
  const visibility = asRecord(source.visibility);
  const summary = asRecord(source.summary);
  const responses = Array.isArray(source.responses) ? source.responses : [];

  const normalizedResponses: AttemptResultQuestionResponse[] = responses.map((row) => {
    const item = asRecord(row);
    const questionType = String(item.question_type ?? "");
    const questionBase: RuntimeQuestion = {
      id: toNumber(item.question_id),
      question_id: toNumber(item.question_id),
      section_id: toNumber(item.section_id),
      section_order: toNullableNumber(item.section_order) ?? 0,
      section_title: String(item.section_title ?? "Section"),
      question_order: toNullableNumber(item.question_order) ?? 0,
      sequence: toNullableNumber(item.question_order) ?? 0,
      question_type: questionType,
      question_text:
        (item.question_text as string | { html?: string | null } | null | undefined) ?? null,
      options: normalizeQuestionOptions(item.options, questionType),
      blank_ids: Array.isArray(item.blank_ids) ? item.blank_ids.map((entry) => String(entry)) : undefined,
      marks_positive: toNullableNumber(item.max_marks),
      marks_negative: toNullableNumber(item.negative_marks),
    };
    questionBase.blank_ids = getBlankIds(questionBase);

    return {
      question_id: toNumber(item.question_id),
      section_id: toNumber(item.section_id),
      section_title: toNullableText(item.section_title),
      section_order: toNullableNumber(item.section_order),
      question_order: toNullableNumber(item.question_order),
      question_type: questionType,
      question_text: questionBase.question_text,
      options: questionBase.options,
      blank_ids: questionBase.blank_ids,
      student_answer: normalizeAnswerForQuestion(questionBase, item.student_answer),
      is_attempted: toBoolean(item.is_attempted),
      is_marked_for_review: toBoolean(item.is_marked_for_review),
      answered_at: (item.answered_at as string | null | undefined) ?? null,
      is_correct:
        item.is_correct === undefined || item.is_correct === null
          ? null
          : toBoolean(item.is_correct),
      marks_awarded: toNullableNumber(item.marks_awarded),
      max_marks: toNullableNumber(item.max_marks),
      negative_marks: toNullableNumber(item.negative_marks),
      correct_answer: questionType === "fill_in_blank" && item.correct_answer && typeof item.correct_answer === "object"
        ? {
            ...asRecord(item.correct_answer),
            blanks: Array.isArray(asRecord(item.correct_answer).blanks)
              ? (asRecord(item.correct_answer).blanks as unknown[]).map((entry) => {
                  const blank = asRecord(entry);
                  return {
                    id: String(blank.id ?? ""),
                    answers: Array.isArray(blank.answers)
                      ? blank.answers.map((answer) => String(answer))
                      : [],
                  };
                })
              : asRecord(item.correct_answer).blanks,
          }
        : questionType === "match_following" && item.correct_answer && typeof item.correct_answer === "object"
          ? {
              ...asRecord(item.correct_answer),
              pairs: Array.isArray(asRecord(item.correct_answer).pairs)
                ? (asRecord(item.correct_answer).pairs as unknown[]).map((entry) => {
                    const pair = asRecord(entry);
                    return {
                      left_id: String(pair.left_id ?? ""),
                      right_id: String(pair.right_id ?? ""),
                    };
                  })
                : asRecord(item.correct_answer).pairs,
            }
          : item.correct_answer,
      solution:
        (item.solution as string | { html?: string | null } | null | undefined) ?? null,
      solution_video_url:
        typeof item.solution_video_url === "string" ? item.solution_video_url : null,
    };
  });

  return {
    attempt: {
      id: toNumber(attempt.id),
      exam_id: toNumber(attempt.exam_id),
      student_id: toNumber(attempt.student_id),
      attempt_number: toNumber(attempt.attempt_number, 1),
      status: String(attempt.status ?? "submitted"),
      started_at: String(attempt.started_at ?? ""),
      submitted_at: (attempt.submitted_at as string | null | undefined) ?? null,
      auto_submitted:
        attempt.auto_submitted === undefined || attempt.auto_submitted === null
          ? null
          : toBoolean(attempt.auto_submitted),
      graded_at: (attempt.graded_at as string | null | undefined) ?? null,
    },
    exam: {
      id: toNumber(exam.id),
      title: String(exam.title ?? "Exam"),
      course_id: toNullableNumber(exam.course_id),
      content_id: toNullableNumber(exam.content_id),
      start_datetime: (exam.start_datetime as string | null | undefined) ?? null,
      end_datetime: (exam.end_datetime as string | null | undefined) ?? null,
      total_duration_minutes: toNullableNumber(exam.total_duration_minutes),
      rank: toNullableNumber(exam.rank),
      percentile: toNullableNumber(exam.percentile),
    },
    visibility: {
      show_result_immediately: toBoolean(visibility.show_result_immediately, true),
      show_score: toBoolean(visibility.show_score, true),
      show_pass_or_fail: toBoolean(visibility.show_pass_or_fail, true),
      show_solutions_to_user: toBoolean(visibility.show_solutions_to_user, false),
      is_released: toBoolean(visibility.is_released, false),
    },
    summary: {
      total_questions: toNumber(summary.total_questions),
      attempted: toNumber(summary.attempted),
      unattempted: toNumber(summary.unattempted),
      correct: toNullableNumber(summary.correct),
      wrong: toNullableNumber(summary.wrong),
      total_possible_marks: toNullableNumber(summary.total_possible_marks),
      total_score: toNullableNumber(summary.total_score),
      percentage: toNullableNumber(summary.percentage),
      is_passed:
        summary.is_passed === undefined || summary.is_passed === null
          ? null
          : toBoolean(summary.is_passed),
    },
    responses: normalizedResponses,
  };
};

export const isRuntimePayloadRich = (runtime: ExamAttemptRuntime | null) => {
  if (!runtime) return false;
  if (!runtime.questions.length || !runtime.sections.length) return false;

  return runtime.questions.every((question) => {
    const hasType = Boolean(question.question_type);
    const hasText = question.question_text !== null && question.question_text !== undefined;
    return hasType && hasText;
  });
};

export const getStudentExams = async (): Promise<StudentExam[]> => {
  const response = await api.get("/student/exams");
  return unwrapArrayPayload(response.data)
    .map(normalizeStudentExam)
    .filter((exam) => Number.isFinite(exam.id) && exam.id > 0);
};

export const getAttemptById = async (attemptId: number): Promise<ExamAttemptRuntime | null> => {
  const response = await api.get(`/student/attempts/${attemptId}`);
  return normalizeRuntimePayload(response.data);
};

export const getAttemptRuntime = getAttemptById;

export const startOrResumeExam = async (examId: number): Promise<ExamAttemptRuntime | null> => {
  const response = await api.post(`/student/exams/${examId}/start`);
  return normalizeRuntimePayload(response.data);
};

export const saveAttemptResponse = async (
  attemptId: number,
  responses: RuntimeResponse | RuntimeResponse[],
  omrLock = false
): Promise<ExamAttemptRuntime | null> => {
  const normalizedResponses = Array.isArray(responses) ? responses : [responses];
  const jsonSafeResponses = normalizedResponses.map((item) => ({
    ...item,
    student_answer: toJsonSafe(item.student_answer ?? null),
  }));

  const response = await api.post(`/student/attempts/${attemptId}/save`, {
    responses: jsonSafeResponses,
    omr_lock: omrLock,
  });

  return normalizeRuntimePayload(asRecord(response.data).attemptState ?? response.data);
};

export const saveAttemptResponses = async (
  attemptId: number,
  responses: RuntimeResponse[],
  omrLock = false
): Promise<ExamAttemptRuntime | null> => saveAttemptResponse(attemptId, responses, omrLock);

export const submitAttempt = async (attemptId: number): Promise<AttemptSubmitResponse> => {
  const response = await api.post(`/student/attempts/${attemptId}/submit`);
  return normalizeSubmitResponse(response.data);
};

export const getAttemptResult = async (attemptId: number): Promise<AttemptResultResponse> => {
  const response = await api.get(`/student/attempts/${attemptId}/result`);
  return normalizeAttemptResultResponse(response.data);
};
