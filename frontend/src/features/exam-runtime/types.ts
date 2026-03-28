export type RuntimeQuestionType = "mcq_single" | "mcq_multiple" | "numerical" | "true_false" | string;
export type RuntimeAttemptStatus = "in_progress" | "submitted" | "graded" | string;

export interface RuntimeOption {
  id: string;
  text: string | { html?: string | null } | null;
}

export interface RuntimeMatchOptionSet {
  left: RuntimeOption[];
  right: RuntimeOption[];
}

export interface RuntimeMatchPair {
  left_id: string;
  right_id: string;
}

export interface RuntimeFillBlankEntry {
  id: string;
  value: string;
}

export interface RuntimeMatchFollowingAnswer {
  pairs: RuntimeMatchPair[];
}

export interface RuntimeFillBlankAnswer {
  blanks: RuntimeFillBlankEntry[];
}

export type RuntimeQuestionOptions = RuntimeOption[] | RuntimeMatchOptionSet;

export interface RuntimeSection {
  id: number;
  title: string;
  order_index: number;
  instructions?: string | null;
  question_count: number;
}

export interface RuntimeQuestion {
  id: number;
  question_id: number;
  section_id: number;
  section_order: number;
  section_title: string;
  question_order: number;
  sequence: number;
  question_type: RuntimeQuestionType;
  question_text: string | { html?: string | null } | null;
  options: RuntimeQuestionOptions;
  blank_ids?: string[];
  marks_positive?: number | null;
  marks_negative?: number | null;
}

export interface RuntimeResponse {
  id?: number;
  question_id: number;
  section_id: number;
  student_answer: unknown;
  is_marked_for_review: boolean;
  is_attempted: boolean;
  answered_at?: string | null;
}

export interface RuntimeAttempt {
  id: number;
  exam_id: number;
  student_id: number;
  attempt_number: number;
  started_at: string;
  submitted_at?: string | null;
  status: RuntimeAttemptStatus;
  omr_lock?: boolean | null;
  auto_submitted?: boolean | null;
}

export interface RuntimeExam {
  id: number;
  title: string;
  course_id?: number | null;
  content_id?: number | null;
  instructions?: string | null;
  total_duration_minutes?: number | null;
  start_datetime?: string | null;
  end_datetime?: string | null;
  show_result_immediately?: boolean;
  show_score?: boolean;
  show_pass_or_fail?: boolean;
  show_solutions_to_user?: boolean;
}

export interface ExamAttemptRuntime {
  attempt: RuntimeAttempt;
  exam: RuntimeExam;
  sections: RuntimeSection[];
  questions: RuntimeQuestion[];
  responses: RuntimeResponse[];
  remaining_seconds: number | null;
  status: string;
  is_read_only: boolean;
}

export interface AttemptSubmitResponse {
  message: string;
  attempt: {
    id: number;
    exam_id: number;
    student_id: number;
    attempt_number: number;
    status: RuntimeAttemptStatus;
    submitted_at?: string | null;
    auto_submitted?: boolean | null;
    total_score?: number | null;
    total_correct?: number | null;
    total_wrong?: number | null;
    total_unattempted?: number | null;
  };
}

export interface AttemptResultVisibility {
  show_result_immediately: boolean;
  show_score: boolean;
  show_pass_or_fail: boolean;
  show_solutions_to_user: boolean;
  is_released: boolean;
}

export interface AttemptResultSummary {
  total_questions: number;
  attempted: number;
  unattempted: number;
  correct: number | null;
  wrong: number | null;
  total_possible_marks: number | null;
  total_score: number | null;
  percentage: number | null;
  is_passed: boolean | null;
}

export interface AttemptResultQuestionResponse {
  question_id: number;
  section_id: number;
  section_title: string | null;
  section_order: number | null;
  question_order: number | null;
  question_type: RuntimeQuestionType;
  question_text: string | { html?: string | null } | null;
  options: RuntimeQuestionOptions;
  blank_ids?: string[];
  student_answer: unknown;
  is_attempted: boolean;
  is_marked_for_review: boolean;
  answered_at: string | null;
  is_correct?: boolean | null;
  marks_awarded?: number | null;
  max_marks?: number | null;
  negative_marks?: number | null;
  correct_answer?: unknown;
  solution?: string | { html?: string | null } | null;
  solution_video_url?: string | null;
}

export interface AttemptResultResponse {
  attempt: {
    id: number;
    exam_id: number;
    student_id: number;
    attempt_number: number;
    status: RuntimeAttemptStatus;
    started_at: string;
    submitted_at: string | null;
    auto_submitted: boolean | null;
    graded_at: string | null;
  };
  exam: {
    id: number;
    title: string;
    course_id?: number | null;
    content_id?: number | null;
    start_datetime: string | null;
    end_datetime: string | null;
    total_duration_minutes: number | null;
    rank?: number | null;
    percentile?: number | null;
  };
  visibility: AttemptResultVisibility;
  summary: AttemptResultSummary;
  responses: AttemptResultQuestionResponse[];
}

export type AutosaveState = "idle" | "saving" | "saved" | "error";

export type PaletteQuestionState =
  | "answered"
  | "review"
  | "answered_review"
  | "visited"
  | "not_visited";
