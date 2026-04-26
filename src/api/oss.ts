import client from './client';

export const getStsToken = () =>
  client.get('/api/oss/sts') as Promise<{
    code: number;
    data: {
      accessKeyId: string;
      accessKeySecret: string;
      securityToken: string;
      expiration: string;
      region: string;
      bucket: string;
      host: string;
    };
  }>;

export const getUploadUrl = (key: string) =>
  client.get('/api/oss/upload-url', { params: { key } }) as Promise<{
    code: number;
    data: { url: string; host: string };
  }>;
