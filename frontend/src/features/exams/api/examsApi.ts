import api from '@/lib/api';
import type {
  ExamSummary,
  ExamListResponse,
  ExamCreateFormState,
  ExamSection,
} from '../types';

// ============================================
// EXAM LIST & RETRIEVAL
// ============================================

export interface ExamFilters {
  q?: string;
  status?: string;
  start_from?: string;
  start_to?: string;
  page?: number;
  page_size?: number;
}

export const fetchExams = async (
  filters: ExamFilters,
  page: number = 1,
  pageSize: number = 25
): Promise<ExamListResponse> => {
  const params = {
    ...filters,
    page,
    page_size: pageSize,
  };
  const res = await api.get('/exams', { params });
  return res.data as ExamListResponse;
};

export const fetchExamById = async (id: number): Promise<ExamSummary> => {
  const res = await api.get(`/exams/${id}`);
  return res.data as ExamSummary;
};

// ============================================
// EXAM CREATE, UPDATE, DELETE
// ============================================

export const createExam = async (payload: Record<string, unknown>): Promise<ExamSummary> => {
  const res = await api.post('/exams', payload);
  return res.data as ExamSummary;
};

export const updateExam = async (
  id: number,
  payload: Partial<ExamCreateFormState>
): Promise<ExamSummary> => {
  const res = await api.put(`/exams/${id}`, payload);
  return res.data as ExamSummary;
};

export const deleteExam = async (id: number): Promise<void> => {
  await api.delete(`/exams/${id}`);
};

// ============================================
// EXAM SECTIONS
// ============================================

export const createExamSection = async (
  examId: number,
  payload: Partial<ExamSection>
): Promise<ExamSection> => {
  const res = await api.post(`/exams/${examId}/sections`, payload);
  return res.data as ExamSection;
};

export const updateExamSection = async (
  examId: number,
  sectionId: number,
  payload: Partial<ExamSection>
): Promise<ExamSection> => {
  const res = await api.put(`/exams/${examId}/sections/${sectionId}`, payload);
  return res.data as ExamSection;
};

export const deleteExamSection = async (examId: number, sectionId: number): Promise<void> => {
  await api.delete(`/exams/${examId}/sections/${sectionId}`);
};

// ============================================
// EXAM QUESTIONS IN SECTIONS
// ============================================

export interface AddQuestionPayload {
  question_id: number;
  order_index?: number;
  marks_override?: number;
  negative_override?: number;
}

export const addQuestionToSection = async (
  examId: number,
  sectionId: number,
  payload: AddQuestionPayload
): Promise<void> => {
  await api.post(`/exams/${examId}/sections/${sectionId}/questions`, payload);
};

// ============================================
// EXAM PUBLISHING
// ============================================

export const publishExam = async (id: number): Promise<ExamSummary> => {
  const res = await api.post(`/exams/${id}/publish`);
  return res.data as ExamSummary;
};

// ============================================
// EXAM ATTEMPTS - STUDENT
// ============================================

export interface ExamAttempt {
  id: number;
  exam_id: number;
  student_id: number;
  attempt_number: number;
  started_at: string;
  submitted_at?: string;
  auto_submitted?: boolean;
  total_score?: number;
  total_correct?: number;
  total_wrong?: number;
  total_unattempted?: number;
  status: 'in_progress' | 'submitted' | 'graded';
}

export const startExamAttempt = async (examId: number): Promise<ExamAttempt> => {
  const res = await api.post(`/student/exams/${examId}/start`);
  return res.data as ExamAttempt;
};

// ============================================
// EXAM RESPONSES - SAVE ANSWERS
// ============================================

export interface ExamResponse {
  question_id: number;
  student_answer?: any;
  is_attempted?: boolean;
  is_marked_for_review?: boolean;
}

export const saveExamResponse = async (
  attemptId: number,
  responses: ExamResponse[]
): Promise<any> => {
  const res = await api.post(`/student/attempts/${attemptId}/save`, {
    responses,
  });
  return res.data;
};

// ============================================
// EXAM SUBMISSION & GRADING
// ============================================

export interface ExamSubmissionResult {
  message: string;
  attempt: ExamAttempt;
}

export const submitExamAttempt = async (attemptId: number): Promise<ExamSubmissionResult> => {
  const res = await api.post(`/student/attempts/${attemptId}/submit`);
  return res.data as ExamSubmissionResult;
};

// ============================================
// EXAM ATTEMPT STATE
// ============================================

export interface AttemptState {
  attempt: ExamAttempt;
  responses?: any[];
  exam?: ExamSummary;
}

export const getAttemptState = async (attemptId: number): Promise<AttemptState> => {
  const res = await api.get(`/student/attempts/${attemptId}`);
  return res.data as AttemptState;
};

// ============================================
// STUDENT EXAMS LIST
// ============================================

export const getStudentExams = async (): Promise<ExamSummary[]> => {
  const res = await api.get('/student/exams');
  return res.data as ExamSummary[];
};
