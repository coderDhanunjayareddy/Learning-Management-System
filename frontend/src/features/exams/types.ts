export type ExamStatus = "draft" | "active" | "completed";

export interface ExamSummary {
  id: number | string;
  title: string;
  description?: string | null;
  start_datetime?: string | null;
  end_datetime?: string | null;
  duration_minutes?: number | null;
  status?: ExamStatus | string | null;
  course_count?: number | null;
  attempts_count?: number | null;
  created_by_name?: string | null;
  tags?: string[] | null;
}

export interface ExamFiltersState {
  search: string;
  status: "" | ExamStatus;
  startFrom: string;
  startTo: string;
}

export interface ExamListResponse {
  data?: ExamSummary[];
  total?: number;
  meta?: {
    page?: number;
    total?: number;
  };
}
export interface ExamCreateFormState {
  title: string;
  description: string;
  total_duration_minutes: string;
  start_datetime: string;
  end_datetime: string;
  instructions: string;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_result_immediately: boolean;
  max_attempts: string;
  show_score: boolean;
  show_pass_or_fail: boolean;
  show_percentile: boolean;
  show_analytics: boolean;
  show_solutions_to_user: boolean;
  pass_percentage: string;
  variable_marks: boolean;
  marks_per_question: string;
  negative_marks: string;
  roundoff_marks: boolean;
  allow_retaking_exam: boolean;
  maximum_allowed_retakes: string;
  allow_retaking_only_for_failed_attempt: boolean;
  interval_between_retakes_minutes: string;
}
export interface ExamSection {
  id: number;
  exam_id: number;
  title: string;
  order_index?: number | null;
  instructions?: string | null;
  marks_per_question?: number | null;
  negative_marks?: number | null;
  question_count?: number | null;
}
