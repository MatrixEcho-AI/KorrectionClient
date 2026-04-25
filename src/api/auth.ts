import client from './client';

export const sendCode = (phone: string) =>
  client.post('/api/auth/send-code', { phone }) as Promise<{ code: number; data: { expiresIn: number } }>;

export const login = (phone: string, code: string) =>
  client.post('/api/auth/login', { phone, code }) as Promise<{
    code: number;
    data: { token: string; user: { id: number; phone: string } };
  }>;
