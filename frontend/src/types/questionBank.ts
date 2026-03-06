export type QuestionType = "mcq_single" | "mcq_multiple" | "numerical" | "true_false";

export type DifficultyLevel = "easy" | "medium" | "hard";

export type QuestionStatus = "draft" | "approved" | "rejected";

export type CorrectAnswer =
  | string
  | string[]
  | number
  | boolean
  | null;

export interface QuestionOption {
  id: string;
  text: string;
  is_correct?: boolean;
}

export interface Question {
  id: string | number;
  question_type: QuestionType;
  question_text: string;
  options?: QuestionOption[];
  correct_answer?: CorrectAnswer;
  subject_id?: string | number | null;
  chapter_id?: string | number | null;
  topic_id?: string | number | null;
  difficulty_level: DifficultyLevel;
  marks_positive: number;
  marks_negative: number;
  exam_tags?: string[];
  status: QuestionStatus;
  created_by?: string;
  created_at?: string;
  review_note?: string | null;
}

export interface CurriculumItem {
  id: string | number;
  name: string;
  subject_id?: string | number | null;
  chapter_id?: string | number | null;
}
