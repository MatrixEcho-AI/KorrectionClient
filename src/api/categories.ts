import client from './client';

export interface Category {
  id: number;
  user_id: number;
  parent_id: number;
  name: string;
  level: number;
  sort_order: number;
}

export const getCategories = (subject_id?: number) =>
  client.get('/api/categories', { params: subject_id ? { subject_id } : undefined }) as Promise<{ code: number; data: Category[] }>;

export const createCategory = (data: { parent_id?: number; subject_id?: number; name: string }) =>
  client.post('/api/categories', data) as Promise<{ code: number; data: { id: number } }>;

export const updateCategory = (id: number, data: { name: string }) =>
  client.put(`/api/categories/${id}`, data) as Promise<{ code: number; data: null }>;

export const deleteCategory = (id: number) =>
  client.delete(`/api/categories/${id}`) as Promise<{ code: number; data: null }>;
