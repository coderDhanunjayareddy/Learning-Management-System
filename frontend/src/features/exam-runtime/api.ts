import api from "@/lib/api";
import type {
  ExamAttemptRuntime,
  RuntimeOption,
  RuntimeQuestion,
  RuntimeResponse,
  RuntimeSection,
} from "@/features/exam-runtime/types";

const toNumber = (value: unknown, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeOptionText = (value: any): string | { html?: string | null } | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (typeof value.html === "string") return { html: value.html };
    if (typeof value.text === "string") return value.text;
    if (typeof value.label === "string") return value.label;
  }
  return String(value);
};

const normalizeOptions = (value: any): RuntimeOption[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((option, index) => ({
      id: String(option?.id ?? index + 1),
      text: normalizeOptionText(option?.text ?? option?.label ?? option),
    }));
  }

  if (typeof value === "object") {
    return Object.entries(value).map(([key, text]) => ({
      id: String(key),
      text: normalizeOptionText(text),
    }));
  }

  return [];
};

const normalizeSection = (item: any): RuntimeSection => ({
  id: toNumber(item?.id ?? item?.section_id),
  title: String(item?.title ?? item?.section_title ?? "Section"),
  order_index: toNumber(item?.order_index ?? item?.section_order, 0),
  instructions: item?.instructions ?? item?.section_instructions ?? null,
  question_count: toNumber(item?.question_count, 0),
});

const normalizeQuestion = (item: any, index: number): RuntimeQuestion => ({
  id: toNumber(item?.id ?? item?.question_id),
  question_id: toNumber(item?.question_id ?? item?.id),
  section_id: toNumber(item?.section_id),
  section_order: toNumber(item?.section_order, 0),
  section_title: String(item?.section_title ?? "Section"),
  question_order: toNumber(item?.question_order ?? item?.order_index, index + 1),
  sequence: toNumber(item?.sequence, index + 1),
  question_type: String(item?.question_type ?? ""),
  question_text: item?.question_text ?? null,
  options: normalizeOptions(item?.options),
  marks_positive: toNullableNumber(item?.marks_positive),
  marks_negative: toNullableNumber(item?.marks_negative),
});

const normalizeResponses = (rows: any[]): RuntimeResponse[] =>
  rows.map((row) => ({
    id: toNullableNumber(row?.id) ?? undefined,
    question_id: toNumber(row?.question_id),
    section_id: toNumber(row?.section_id),
    student_answer: row?.student_answer ?? null,
    is_marked_for_review: Boolean(row?.is_marked_for_review),
    is_attempted: Boolean(row?.is_attempted),
    answered_at: row?.answered_at ?? null,
  }));

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
    const section = map.get(question.section_id)!;
    section.question_count += 1;
  });

  return Array.from(map.values()).sort((a, b) => {
    if (a.order_index === b.order_index) return a.id - b.id;
    return a.order_index - b.order_index;
  });
};

export const normalizeRuntimePayload = (raw: any): ExamAttemptRuntime | null => {
  const source = raw?.attemptState ?? raw;
  if (!source?.attempt || !source?.exam) return null;

  const attemptId = toNullableNumber(source.attempt?.id);
  const examId = toNullableNumber(source.exam?.id ?? source.attempt?.exam_id);
  if (!attemptId || !examId) return null;

  const questionsRaw = Array.isArray(source.questions) ? source.questions : [];
  const questions = questionsRaw.map(normalizeQuestion).filter((question) => question.id > 0 && question.section_id > 0);

  const sectionsRaw = Array.isArray(source.sections) ? source.sections : [];
  const sections = (sectionsRaw.length ? sectionsRaw.map(normalizeSection) : deriveSectionsFromQuestions(questions)).filter(
    (section) => section.id > 0
  );

  const responsesRaw = Array.isArray(source.responses) ? source.responses : [];

  return {
    attempt: {
      id: attemptId,
      exam_id: toNumber(source.attempt.exam_id ?? examId),
      student_id: toNumber(source.attempt.student_id),
      attempt_number: toNumber(source.attempt.attempt_number, 1),
      started_at: String(source.attempt.started_at ?? ""),
      submitted_at: source.attempt.submitted_at ?? null,
      status: String(source.attempt.status ?? source.status ?? "in_progress"),
      omr_lock: source.attempt.omr_lock ?? null,
      auto_submitted: source.attempt.auto_submitted ?? null,
    },
    exam: {
      id: examId,
      title: String(source.exam.title ?? "Exam"),
      total_duration_minutes: toNullableNumber(source.exam.total_duration_minutes),
      start_datetime: source.exam.start_datetime ?? null,
      end_datetime: source.exam.end_datetime ?? null,
    },
    sections,
    questions,
    responses: normalizeResponses(responsesRaw),
    remaining_seconds: toNullableNumber(source.remaining_seconds),
    status: String(source.status ?? source.attempt.status ?? "in_progress"),
    is_read_only: Boolean(
      source.is_read_only ?? (source.status === "submitted" || source.status === "graded")
    ),
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

export const getAttemptRuntime = async (attemptId: number): Promise<ExamAttemptRuntime | null> => {
  const response = await api.get(`/student/attempts/${attemptId}`);
  return normalizeRuntimePayload(response.data);
};

export const startOrResumeExam = async (examId: number): Promise<ExamAttemptRuntime | null> => {
  const response = await api.post(`/student/exams/${examId}/start`);
  return normalizeRuntimePayload(response.data);
};

export const saveAttemptResponses = async (
  attemptId: number,
  responses: RuntimeResponse[],
  omrLock = false
): Promise<ExamAttemptRuntime | null> => {
  const response = await api.post(`/student/attempts/${attemptId}/save`, {
    responses,
    omr_lock: omrLock,
  });
  return normalizeRuntimePayload(response.data?.attemptState ?? response.data);
};
