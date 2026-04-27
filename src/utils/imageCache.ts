import { Filesystem, Directory } from '@capacitor/filesystem';

const CACHE_DIR = 'image_cache';

function urlToFilename(url: string): string {
  // Simple hash — use last path segment + query hash
  const clean = url.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9_.-]/g, '_').slice(-120);
  return `${clean}.img`;
}

export async function getCachedImageUri(url: string): Promise<string | null> {
  try {
    const filename = urlToFilename(url);
    const result = await Filesystem.getUri({
      path: `${CACHE_DIR}/${filename}`,
      directory: Directory.Cache,
    });
    return result.uri;
  } catch {
    return null;
  }
}

export async function cacheImage(url: string): Promise<void> {
  try {
    const existing = await getCachedImageUri(url);
    if (existing) return; // Already cached

    const response = await fetch(url);
    if (!response.ok) return;
    const blob = await response.blob();
    const base64 = await blobToBase64(blob);
    const filename = urlToFilename(url);

    await Filesystem.writeFile({
      path: `${CACHE_DIR}/${filename}`,
      directory: Directory.Cache,
      data: base64,
      recursive: true,
    });
  } catch {
    // Silently fail — cache is best-effort
  }
}

export async function getCacheSize(): Promise<number> {
  try {
    const result = await Filesystem.readdir({
      path: CACHE_DIR,
      directory: Directory.Cache,
    });
    let totalSize = 0;
    for (const file of result.files) {
      try {
        const stat = await Filesystem.stat({
          path: `${CACHE_DIR}/${file.name}`,
          directory: Directory.Cache,
        });
        totalSize += stat.size;
      } catch {
        // File may have been deleted
      }
    }
    return totalSize;
  } catch {
    return 0;
  }
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function clearImageCache(): Promise<void> {
  try {
    await Filesystem.rmdir({
      path: CACHE_DIR,
      directory: Directory.Cache,
      recursive: true,
    });
  } catch {
    // Directory may not exist
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
