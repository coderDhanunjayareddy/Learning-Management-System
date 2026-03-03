import api from '@/lib/api';
import type { Question, QuestionFilters, QuestionListResponse } from '../types';

export type SubjectOption = { id: number; name: string };
export type ChapterOption = { id: number; name: string };
export type TopicOption = { id: number; name: string };

export const fetchQuestions = async (
  filters: QuestionFilters,
  page: number,
  pageSize: number
): Promise<QuestionListResponse> => {
  const params = {
    ...filters,
    page,
    page_size: pageSize,
  };
  const res = await api.get('/questions', { params });
  return res.data as QuestionListResponse;
};

export const fetchQuestionById = async (id: number): Promise<Question> => {
  const res = await api.get(`/questions/${id}`);
  return res.data as Question;
};

export const createQuestion = async (payload: Record<string, unknown>): Promise<Question> => {
  const res = await api.post('/questions', payload);
  return res.data as Question;
};

export const updateQuestion = async (id: number, payload: Record<string, unknown>): Promise<Question> => {
  const res = await api.put(`/questions/${id}`, payload);
  return res.data as Question;
};

export const approveQuestion = async (id: number): Promise<Question> => {
  const res = await api.post(`/questions/${id}/approve`);
  return res.data as Question;
};

export const rejectQuestion = async (id: number, reason: string): Promise<Question> => {
  const res = await api.post(`/questions/${id}/reject`, { reason });
  return res.data as Question;
};

export const fetchSubjects = async (): Promise<SubjectOption[]> => {
  const res = await api.get('/subjects');
  return res.data as SubjectOption[];
};

export const fetchChapters = async (subjectId: number): Promise<ChapterOption[]> => {
  const res = await api.get(`/subjects/${subjectId}/chapters`);
  return res.data as ChapterOption[];
};

export const fetchTopics = async (chapterId: number): Promise<TopicOption[]> => {
  const res = await api.get(`/chapters/${chapterId}/topics`);
  return res.data as TopicOption[];
};
