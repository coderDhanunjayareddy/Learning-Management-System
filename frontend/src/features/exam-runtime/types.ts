export type RuntimeQuestionType = "mcq_single" | "mcq_multiple" | "numerical" | "true_false" | string;

export interface RuntimeOption {
  id: string;
  text: string | { html?: string | null } | null;
}

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
  options: RuntimeOption[];
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
  status: string;
  omr_lock?: boolean | null;
  auto_submitted?: boolean | null;
}

export interface RuntimeExam {
  id: number;
  title: string;
  total_duration_minutes?: number | null;
  start_datetime?: string | null;
  end_datetime?: string | null;
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

export type AutosaveState = "idle" | "saving" | "saved" | "error";

export type PaletteQuestionState =
  | "answered"
  | "review"
  | "answered_review"
  | "visited"
  | "not_visited";
