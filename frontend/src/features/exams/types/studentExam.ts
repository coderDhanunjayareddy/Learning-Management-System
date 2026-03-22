export type StudentExamStatus = "upcoming" | "ongoing" | "completed" | "unknown";

export interface StudentExam {
  id: number;
  title: string;
  description: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
  total_duration_minutes: number | null;
  in_progress_attempt_id?: number | null;
  has_in_progress_attempt?: boolean;
}
