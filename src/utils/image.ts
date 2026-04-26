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

export function sharpenCanvas(canvas: HTMLCanvasElement, amount: number = 1) {
  const ctx = canvas.getContext('2d')!;
  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const output = new Uint8ClampedArray(data.length);

  // Laplacian sharpen kernel
  const kernel = [0, -1 * amount, 0, -1 * amount, 1 + 4 * amount, -1 * amount, 0, -1 * amount, 0];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0, g = 0, b = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const kidx = (ky + 1) * 3 + (kx + 1);
          r += data[idx] * kernel[kidx];
          g += data[idx + 1] * kernel[kidx];
          b += data[idx + 2] * kernel[kidx];
        }
      }
      const outIdx = (y * width + x) * 4;
      output[outIdx] = Math.min(255, Math.max(0, r));
      output[outIdx + 1] = Math.min(255, Math.max(0, g));
      output[outIdx + 2] = Math.min(255, Math.max(0, b));
      output[outIdx + 3] = data[outIdx + 3];
    }
  }

  // Copy edge pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        const idx = (y * width + x) * 4;
        output[idx] = data[idx];
        output[idx + 1] = data[idx + 1];
        output[idx + 2] = data[idx + 2];
        output[idx + 3] = data[idx + 3];
      }
    }
  }

  const outImgData = new ImageData(output, width, height);
  ctx.putImageData(outImgData, 0, 0);
}

export function enhanceDocument(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Grayscale + contrast boost for document scan look
  const contrast = 1.35;
  const intercept = 128 * (1 - contrast);

  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = Math.min(255, Math.max(0, contrast * gray + intercept + 10));
    data[i + 1] = Math.min(255, Math.max(0, contrast * gray + intercept + 10));
    data[i + 2] = Math.min(255, Math.max(0, contrast * gray + intercept + 10));
  }

  ctx.putImageData(imgData, 0, 0);
  sharpenCanvas(canvas, 0.8);
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
