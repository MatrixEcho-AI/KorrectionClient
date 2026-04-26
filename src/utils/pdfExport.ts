import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

async function preloadImages(element: HTMLElement) {
  const images = Array.from(element.querySelectorAll('img'));
  const replacements: { img: HTMLImageElement; objectUrl: string }[] = [];

  for (const img of images) {
    const src = img.getAttribute('src');
    if (!src || src.startsWith('blob:') || src.startsWith('data:')) continue;
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      img.setAttribute('data-original-src', src);
      img.src = objectUrl;
      replacements.push({ img, objectUrl });
    } catch (err) {
      console.error('Failed to preload image:', src, err);
    }
  }

  // wait for all images to load
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

function restoreImages(replacements: { img: HTMLImageElement; objectUrl: string }[]) {
  for (const { img, objectUrl } of replacements) {
    const originalSrc = img.getAttribute('data-original-src');
    if (originalSrc) img.src = originalSrc;
    img.removeAttribute('data-original-src');
    URL.revokeObjectURL(objectUrl);
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
      useCORS: true,
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
