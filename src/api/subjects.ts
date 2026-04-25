import client from './client';

export interface Subject {
  id: number;
  user_id: number;
  name: string;
  sort_order: number;
  created_at: number;
}

export const getSubjects = () =>
  client.get('/api/subjects') as Promise<{ code: number; data: Subject[] }>;

export const createSubject = (data: { name: string }) =>
  client.post('/api/subjects', data) as Promise<{ code: number; data: { id: number } }>;

export const updateSubject = (id: number, data: { name: string }) =>
  client.put(`/api/subjects/${id}`, data) as Promise<{ code: number; data: null }>;

export const deleteSubject = (id: number) =>
  client.delete(`/api/subjects/${id}`) as Promise<{ code: number; data: null }>;
