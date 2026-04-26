export async function compressImage(file: File, maxLongEdge = 1920, maxSizeMB = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const longEdge = Math.max(width, height);
      if (longEdge > maxLongEdge) {
        const ratio = maxLongEdge / longEdge;
        width *= ratio;
        height *= ratio;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      const tryCompress = (quality: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Canvas to blob failed'));
            if (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.3) {
              tryCompress(quality - 0.1);
            } else {
              resolve(blob);
            }
          },
          'image/jpeg',
          quality
        );
      };
      tryCompress(0.92);
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = url;
  });
}

export async function uploadToOss(
  file: File | Blob,
  info: { url: string; host: string },
  key: string
): Promise<string> {
  console.log('[UPLOAD] START fetch PUT', { key, host: info.host });
  const resp = await fetch(info.url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': 'image/jpeg' },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OSS PUT failed: ${resp.status} ${text}`);
  }
  const url = `https://${info.host}/${key}`;
  console.log('[UPLOAD] success', url);
  return url;
}
