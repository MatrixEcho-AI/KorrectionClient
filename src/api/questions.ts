import client from './client';

export interface QuestionImage {
  id: number;
  image_url: string;
  image_type: 'original_question' | 'wrong_solution' | 'reference_answer';
  ocr_text?: string;
  sort_order: number;
}

export interface RedoSession {
  id: number;
  question: { question: string; options: string[]; answer: string; explanation: string };
}

export interface Question {
  id: number;
  user_id: number;
  category_id: number;
  subject_id: number;
  status: 'photo' | 'summary' | 'review' | 'redo' | 'completed' | 'deleted';
  reason_text?: string;
  review_count: number;
  last_review_at?: number;
  created_at: number;
  category_name?: string;
  images?: QuestionImage[];
  tags?: { id: number; name: string }[];
  pending_redos?: RedoSession[];
}

export const getQuestions = (params?: {
  status?: string;
  category_id?: number;
  tag_id?: number;
  subject_id?: number;
  page?: number;
  pageSize?: number;
}) =>
  client.get('/api/questions', { params }) as Promise<{
    code: number;
    data: { list: Question[]; total: number; page: number; pageSize: number };
  }>;

export const getQuestion = (id: number) =>
  client.get(`/api/questions/${id}`) as Promise<{ code: number; data: Question & { images: QuestionImage[]; tags: any[]; reviews: any[]; redo: any } }>;

export const createQuestion = (category_id: number, subject_id?: number) =>
  client.post('/api/questions', { category_id, subject_id }) as Promise<{ code: number; data: { id: number } }>;

export const updateQuestion = (id: number, data: Partial<Question>) =>
  client.put(`/api/questions/${id}`, data) as Promise<{ code: number; data: null }>;

export const addImage = (questionId: number, data: { image_url: string; image_type: string; sort_order?: number }) =>
  client.post(`/api/questions/${questionId}/images`, data) as Promise<{ code: number; data: { id: number } }>;

export const uploadImage = (questionId: number, formData: FormData) =>
  client.post(`/api/questions/${questionId}/images/upload`, formData) as Promise<{ code: number; data: { id: number; image_url: string } }>;

export const triggerOcr = (questionId: number) =>
  client.post(`/api/questions/${questionId}/ocr`) as Promise<{ code: number; data: null }>;

export const submitSummary = (questionId: number, data: { reason_text: string; category_id?: number; tag_ids: number[] }) =>
  client.post(`/api/questions/${questionId}/summary`, data) as Promise<{ code: number; data: null }>;

export const submitReview = (questionId: number, action: 'understood' | 'not_understood') =>
  client.post(`/api/questions/${questionId}/review`, { action }) as Promise<{ code: number; data: null }>;

export const generateRedo = (questionId: number) =>
  client.post(`/api/questions/${questionId}/redo`) as Promise<{
    code: number;
    data: { sessionId: number; question: { question: string; options: string[]; answer: string; explanation: string } };
  }>;

export const getRedoSession = (questionId: number, sessionId: number) =>
  client.get(`/api/questions/${questionId}/redo/session/${sessionId}`) as Promise<{
    code: number;
    data: { sessionId: number; question: { question: string; options: string[]; answer: string; explanation: string } };
  }>;

export const getPendingRedos = (questionId: number) =>
  client.get(`/api/questions/${questionId}/redo/pending`) as Promise<{
    code: number;
    data: { id: number; question: { question: string; options: string[]; answer: string; explanation: string }; createdAt: number }[];
  }>;

export const submitRedo = (questionId: number, data: { session_id: number; answer: string }) =>
  client.post(`/api/questions/${questionId}/redo/submit`, data) as Promise<{
    code: number;
    data: { isCorrect: boolean; correctAnswer: string; explanation: string };
  }>;

export const deleteQuestion = (id: number) =>
  client.delete(`/api/questions/${id}`) as Promise<{ code: number; data: null }>;

export const restoreQuestion = (id: number) =>
  client.post(`/api/questions/${id}/restore`) as Promise<{ code: number; data: null }>;

export const permanentDeleteQuestion = (id: number) =>
  client.delete(`/api/questions/${id}/permanent`) as Promise<{ code: number; data: null }>;

export const getRecommendations = (questionId: number) =>
  client.post(`/api/questions/${questionId}/recommend`) as Promise<{
    code: number;
    data: { category_id: number; tag_ids: number[] };
  }>;
