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
      endpoint: string;
    };
  }>;
