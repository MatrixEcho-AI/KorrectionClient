import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getProxyImageUrl } from '@/api/images';

export interface PdfRecord {
  id: string;
  filename: string;
  title: string;
  questionCount: number;
  createdAt: number;
}

const RECORDS_KEY = 'pdf_history';
const EXPORTS_DIR = 'exports';

export async function getPdfRecords(): Promise<PdfRecord[]> {
  const { value } = await Preferences.get({ key: RECORDS_KEY });
  return value ? JSON.parse(value) : [];
}

export async function savePdfRecord(record: PdfRecord) {
  const { value } = await Preferences.get({ key: RECORDS_KEY });
  const records: PdfRecord[] = value ? JSON.parse(value) : [];
  records.unshift(record);
  await Preferences.set({ key: RECORDS_KEY, value: JSON.stringify(records.slice(0, 100)) });
}

export async function deletePdfRecord(id: string) {
  const { value } = await Preferences.get({ key: RECORDS_KEY });
  const records: PdfRecord[] = value ? JSON.parse(value) : [];
  const filtered = records.filter((r) => r.id !== id);
  await Preferences.set({ key: RECORDS_KEY, value: JSON.stringify(filtered) });

  try {
    await Filesystem.deleteFile({
      path: `${EXPORTS_DIR}/${id}.pdf`,
      directory: Directory.Documents,
    });
  } catch {
    // ignore if file doesn't exist
  }
}

export async function getPdfUri(id: string): Promise<string> {
  const result = await Filesystem.getUri({
    path: `${EXPORTS_DIR}/${id}.pdf`,
    directory: Directory.Documents,
  });
  return result.uri;
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function preloadImages(element: HTMLElement) {
  const images = Array.from(element.querySelectorAll('img'));
  const replacements: { img: HTMLImageElement; originalSrc: string }[] = [];

  const { value: token } = await Preferences.get({ key: 'token' });

  for (const img of images) {
    img.removeAttribute('crossOrigin');
    img.removeAttribute('crossorigin');

    const src = img.getAttribute('src');
    if (!src || src.startsWith('blob:') || src.startsWith('data:')) continue;

    // Try the original URL first (direct OSS access — works in Capacitor WebView
    // where CORS is not enforced), then fall back to the proxy for browser
    // environments where CORS requires it.
    const proxySrc = src.includes('/api/images/proxy') ? src : getProxyImageUrl(src);
    const urlsToTry = src.includes('/api/images/proxy')
      ? [src]
      : [src, proxySrc];

    for (const fetchUrl of urlsToTry) {
      try {
        const isProxy = fetchUrl.includes('/api/images/proxy');
        const fetchHeaders: Record<string, string> = {};
        if (isProxy && token) {
          fetchHeaders['Authorization'] = `Bearer ${token}`;
        }
        const response = await fetch(fetchUrl, { headers: fetchHeaders });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) {
          throw new Error(`Not an image: ${contentType}`);
        }
        const blob = await response.blob();
        const dataUri = await blobToDataUri(blob);
        img.setAttribute('data-original-src', src);
        img.src = dataUri;
        replacements.push({ img, originalSrc: src });
        break; // success, don't try next URL
      } catch (err) {
        if (fetchUrl === urlsToTry[urlsToTry.length - 1]) {
          console.error('Failed to preload image:', src, err);
        }
      }
    }
  }

  // wait for all images to finish loading
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );

  return replacements;
}

function restoreImages(replacements: { img: HTMLImageElement; originalSrc: string }[]) {
  for (const { img, originalSrc } of replacements) {
    img.src = originalSrc;
    img.removeAttribute('data-original-src');
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function generateAndSavePdf(
  element: HTMLElement,
  title: string,
  questionCount: number
): Promise<PdfRecord> {
  const replacements = await preloadImages(element);

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: false,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pdfWidth;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    const pdfBlob = pdf.output('blob');
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);

    const id = `export-${Date.now()}`;
    const filename = `${id}.pdf`;

    try {
      await Filesystem.mkdir({
        path: EXPORTS_DIR,
        directory: Directory.Documents,
        recursive: true,
      });
    } catch {
      // directory may already exist
    }

    await Filesystem.writeFile({
      path: `${EXPORTS_DIR}/${filename}`,
      directory: Directory.Documents,
      data: base64,
    });

    const record: PdfRecord = {
      id,
      filename,
      title,
      questionCount,
      createdAt: Date.now(),
    };

    await savePdfRecord(record);
    return record;
  } finally {
    restoreImages(replacements);
  }
}
