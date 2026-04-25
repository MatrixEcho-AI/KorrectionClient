import client from './client';

export interface Tag {
  id: number;
  user_id: number;
  subject_id: number;
  name: string;
}

export const getTags = (subjectId: number) =>
  client.get(`/api/tags?subject_id=${subjectId}`) as Promise<{ code: number; data: Tag[] }>;

export const createTag = (data: { subject_id: number; name: string }) =>
  client.post('/api/tags', data) as Promise<{ code: number; data: { id: number } }>;
