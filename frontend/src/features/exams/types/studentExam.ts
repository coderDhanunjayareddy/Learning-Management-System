export type StudentExamStatus =
  | "upcoming"
  | "ongoing"
  | "completed"
  | "max_attempts_reached"
  | "expired"
  | "unknown";

export interface StudentExam {
  id: number;
  title: string;
  description: string | null;
  course_id?: number | null;
  content_id?: number | null;
  start_datetime: string | null;
  end_datetime: string | null;
  total_duration_minutes: number | null;
  computed_status?: string | null;
  status?: string | null;
  max_attempts?: number | null;
  attempt_count?: number;
  has_completed?: boolean;
  in_progress_attempt_id?: number | null;
  has_in_progress_attempt?: boolean;
  latest_completed_attempt_id?: number | null;
  show_result_immediately?: boolean;
  show_score?: boolean;
  show_pass_or_fail?: boolean;
  show_solutions_to_user?: boolean;
}
