import client from './client';

export const exportData = (data: {
  question_ids: number[];
  options?: Record<string, boolean>;
  sort?: { field: string; order: 'asc' | 'desc' };
}) =>
  client.post('/api/export/data', data) as Promise<{
    code: number;
    data: { questions: any[]; options: Record<string, boolean>; sort: any };
  }>;
