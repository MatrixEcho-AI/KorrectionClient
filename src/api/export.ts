import client from './client';

export const exportPdf = (data: {
  question_ids: number[];
  options?: Record<string, boolean>;
  sort?: { field: string; order: 'asc' | 'desc' };
  paperSize?: { name?: string; width?: number; height?: number };
}) =>
  client.post('/api/export/pdf', data) as Promise<{ code: number; data: { url: string; ossKey: string } }>;
