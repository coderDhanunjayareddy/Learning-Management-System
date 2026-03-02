export type QuestionType = 'mcq_single' | 'mcq_multiple' | 'numerical' | 'true_false';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type QuestionStatus = 'draft' | 'approved' | 'rejected' | 'archived';

export interface QuestionText {
  html?: string | null;
  latex?: string | null;
  images?: Array<{ url: string; alt?: string | null }>;
  [key: string]: unknown;
}

export interface Question {
  id: number;
  client_id: number | null;
  school_id: number | null;
  question_type: QuestionType;
  question_text: QuestionText;
  options?: unknown;
  correct_answer: unknown;
  solution?: unknown;
  solution_video_url?: string | null;
  subject_id: number;
  chapter_id: number;
  topic_id: number | null;
  difficulty_level: QuestionDifficulty;
  exam_tags?: string[];
  marks_positive: number;
  marks_negative: number;
  status: QuestionStatus;
  created_by: number;
  approved_by?: number | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface QuestionListResponse {
  data: Question[];
  page: number;
  page_size: number;
  total: number;
}

export interface QuestionFilters {
  q?: string;
  subject_id?: string;
  chapter_id?: string;
  topic_id?: string;
  question_type?: QuestionType | '';
  difficulty_level?: QuestionDifficulty | '';
  status?: QuestionStatus | '';
  created_by?: string;
  school_id?: string;
}
