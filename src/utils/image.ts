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
  sts: { accessKeyId: string; accessKeySecret: string; securityToken: string; bucket: string; region: string; endpoint: string },
  key: string
): Promise<string> {
  const OSS = await import('ali-oss');
  const client = new OSS.default({
    region: sts.region,
    accessKeyId: sts.accessKeyId,
    accessKeySecret: sts.accessKeySecret,
    stsToken: sts.securityToken,
    bucket: sts.bucket,
    endpoint: sts.endpoint,
  });
  await client.put(key, file);
  return client.generateObjectUrl(key);
}
