import type {
  AttemptResultQuestionResponse,
  AttemptResultResponse,
} from "@/features/exam-runtime/types";

export type ReviewStatus = "correct" | "partial" | "wrong" | "unattempted" | "attempted";

export interface SectionBreakdownItem {
  section_id: number;
  section_title: string;
  section_order: number;
  total_questions: number;
  attempted: number;
  unattempted: number;
  correct: number | null;
  wrong: number | null;
  marks_obtained: number | null;
  max_marks: number | null;
  accuracy_percentage: number | null;
}

export interface QuestionSectionGroup {
  section_id: number;
  section_title: string;
  section_order: number;
  questions: AttemptResultQuestionResponse[];
}

export const formatDateTime = (value?: string | null) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
};

export const formatPercent = (value?: number | null) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return "--";
  return `${value.toFixed(2)}%`;
};

export const toQuestionSerial = (question: AttemptResultQuestionResponse, fallback: number) => {
  if (question.question_order !== null && question.question_order !== undefined && question.question_order > 0) {
    return question.question_order;
  }
  return fallback;
};

export const getReviewStatus = (question: AttemptResultQuestionResponse): ReviewStatus => {
  if (!question.is_attempted) return "unattempted";
  if (question.is_correct === true) return "correct";
  if (
    question.is_correct === null &&
    question.marks_awarded !== null &&
    question.marks_awarded !== undefined &&
    question.marks_awarded > 0
  ) {
    return "partial";
  }
  if (question.is_correct === false) return "wrong";
  return "attempted";
};

export const deriveSectionBreakdown = (result: AttemptResultResponse): SectionBreakdownItem[] => {
  const scoreVisible = result.visibility.show_score && result.visibility.is_released;
  const map = new Map<number, SectionBreakdownItem>();

  result.responses.forEach((response) => {
    const sectionId = response.section_id;
    const section = map.get(sectionId) ?? {
      section_id: sectionId,
      section_title: response.section_title || `Section ${sectionId}`,
      section_order: response.section_order ?? Number.MAX_SAFE_INTEGER,
      total_questions: 0,
      attempted: 0,
      unattempted: 0,
      correct: scoreVisible ? 0 : null,
      wrong: scoreVisible ? 0 : null,
      marks_obtained: scoreVisible ? 0 : null,
      max_marks: scoreVisible ? 0 : null,
      accuracy_percentage: null,
    };

    section.total_questions += 1;
    if (response.is_attempted) {
      section.attempted += 1;
    } else {
      section.unattempted += 1;
    }

    if (scoreVisible) {
      if (response.is_correct === true && section.correct !== null) section.correct += 1;
      if (response.is_correct === false && response.is_attempted && section.wrong !== null) section.wrong += 1;
      if (section.marks_obtained !== null) section.marks_obtained += Number(response.marks_awarded ?? 0);
      if (section.max_marks !== null) section.max_marks += Number(response.max_marks ?? 0);
    }

    map.set(sectionId, section);
  });

  return Array.from(map.values())
    .map((section) => ({
      ...section,
      accuracy_percentage:
        section.correct !== null && section.attempted > 0
          ? Number(((section.correct / section.attempted) * 100).toFixed(2))
          : null,
      marks_obtained:
        section.marks_obtained !== null ? Number(section.marks_obtained.toFixed(2)) : null,
      max_marks: section.max_marks !== null ? Number(section.max_marks.toFixed(2)) : null,
    }))
    .sort((a, b) => {
      if (a.section_order === b.section_order) return a.section_id - b.section_id;
      return a.section_order - b.section_order;
    });
};

export const groupQuestionsBySection = (responses: AttemptResultQuestionResponse[]): QuestionSectionGroup[] => {
  const map = new Map<number, QuestionSectionGroup>();
  responses.forEach((response) => {
    const sectionId = response.section_id;
    const group = map.get(sectionId) ?? {
      section_id: sectionId,
      section_title: response.section_title || `Section ${sectionId}`,
      section_order: response.section_order ?? Number.MAX_SAFE_INTEGER,
      questions: [],
    };
    group.questions.push(response);
    map.set(sectionId, group);
  });

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      questions: [...group.questions].sort((a, b) => {
        const ao = a.question_order ?? Number.MAX_SAFE_INTEGER;
        const bo = b.question_order ?? Number.MAX_SAFE_INTEGER;
        if (ao === bo) return a.question_id - b.question_id;
        return ao - bo;
      }),
    }))
    .sort((a, b) => {
      if (a.section_order === b.section_order) return a.section_id - b.section_id;
      return a.section_order - b.section_order;
    });
};

export const getTimeSpentSeconds = (startedAt?: string | null, submittedAt?: string | null) => {
  if (!startedAt || !submittedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(submittedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.floor((end - start) / 1000);
};

export const formatDuration = (seconds?: number | null) => {
  if (seconds === null || seconds === undefined || seconds < 0) return "--";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};
