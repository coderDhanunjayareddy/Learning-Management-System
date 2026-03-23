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
  start_datetime: string | null;
  end_datetime: string | null;
  total_duration_minutes: number | null;
  computed_status?: string | null;
  status?: string | null;
  in_progress_attempt_id?: number | null;
  has_in_progress_attempt?: boolean;
}
