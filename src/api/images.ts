const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export function getProxyImageUrl(originalUrl: string): string {
  if (!originalUrl || originalUrl.startsWith('blob:') || originalUrl.startsWith('data:')) {
    return originalUrl;
  }
  return `${API_BASE}/api/images/proxy?url=${encodeURIComponent(originalUrl)}`;
}
