import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import jsPDF from 'jspdf';
import { getProxyImageUrl } from '@/api/images';

export type PageSize = 'a4' | 'a5' | 'b4' | 'b5';

export interface ProgressInfo {
  phase: 'images' | 'rendering';
  current: number;
  total: number;
}

export interface PdfRecord {
  id: string;
  filename: string;
  title: string;
  questionCount: number;
  createdAt: number;
}

export interface PrintBlock {
  type: 'heading' | 'text' | 'image';
  text?: string;
  imageUrl?: string;
  boxed?: boolean;
}

export interface PrintQuestion {
  blocks: PrintBlock[];
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

async function fetchImageAsDataUri(url: string, token: string | null): Promise<string | null> {
  const proxySrc = url.includes('/api/images/proxy') ? url : getProxyImageUrl(url);
  const urlsToTry = url.includes('/api/images/proxy') ? [url] : [url, proxySrc];

  for (const fetchUrl of urlsToTry) {
    try {
      const isProxy = fetchUrl.includes('/api/images/proxy');
      const headers: Record<string, string> = {};
      if (isProxy && token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(fetchUrl, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.startsWith('image/')) throw new Error(`Not an image: ${contentType}`);
      return await blobToDataUri(await response.blob());
    } catch (err) {
      if (fetchUrl === urlsToTry[urlsToTry.length - 1]) {
        console.error('Failed to load image:', url, err);
      }
    }
  }
  return null;
}

function fontSizePt(type: 'heading' | 'text'): number {
  return type === 'heading' ? 13 : 10;
}

const BLOCK_GAP_MM = 4;

// Render text to a canvas — the browser's Canvas API natively supports CJK fonts.
function renderTextBlock(text: string, type: 'heading' | 'text', usableWidthMm: number, boxed = false, customFontSizePt?: number) {
  const scale = 2;
  const ptToPx = 96 / 72;
  const mmToPx = 96 / 25.4;
  const fontSize = (customFontSizePt ?? fontSizePt(type)) * ptToPx * scale;
  const lineHeight = fontSize * 1.6;
  const paddingPx = boxed ? 12 * scale : 0;
  const maxTextWidthPx = usableWidthMm * mmToPx * scale - paddingPx * 2;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const font = `${type === 'heading' ? 'bold ' : ''}${fontSize}px sans-serif`;
  ctx.font = font;

  // Wrap text
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    if (paragraph === '') { lines.push(''); continue; }
    let current = '';
    for (const char of paragraph) {
      const test = current + char;
      if (ctx.measureText(test).width > maxTextWidthPx && current.length > 0) {
        lines.push(current);
        current = char;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  }

  const textH = Math.max(1, Math.ceil(lines.length * lineHeight));
  const totalW = usableWidthMm * mmToPx * scale;
  const totalH = textH + paddingPx * 2;

  canvas.width = totalW;
  canvas.height = totalH;

  // Draw border if boxed
  if (boxed) {
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1.5 * scale;
    ctx.strokeRect(1 * scale, 1 * scale, totalW - 2 * scale, totalH - 2 * scale);
  }

  ctx.font = font;
  ctx.fillStyle = '#333333';
  ctx.textBaseline = 'top';

  for (let i = 0; i < lines.length; i++) {
    if (lines[i]) ctx.fillText(lines[i], paddingPx, paddingPx + i * lineHeight);
  }

  const dataUri = canvas.toDataURL('image/png');
  const imgH = (canvas.height / (mmToPx * scale));
  return { dataUri, imgW: usableWidthMm, imgH, canvas };
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
  questions: PrintQuestion[],
  title: string,
  questionCount: number,
  pageSize: PageSize = 'a4',
  onProgress?: (info: ProgressInfo) => void
): Promise<PdfRecord> {
  // ── Phase 1: preload all images ──
  const { value: token } = await Preferences.get({ key: 'token' });
  const imageBlocks: { qIdx: number; bIdx: number; url: string }[] = [];
  questions.forEach((q, qi) => {
    q.blocks.forEach((b, bi) => {
      if (b.type === 'image' && b.imageUrl) {
        imageBlocks.push({ qIdx: qi, bIdx: bi, url: b.imageUrl });
      }
    });
  });

  const imageDataUriMap = new Map<string, string>();
  let loaded = 0;
  const total = imageBlocks.length;

  for (const ib of imageBlocks) {
    if (!imageDataUriMap.has(ib.url)) {
      const dataUri = await fetchImageAsDataUri(ib.url, token);
      if (dataUri) imageDataUriMap.set(ib.url, dataUri);
    }
    loaded++;
    onProgress?.({ phase: 'images', current: loaded, total });
  }
  if (total === 0) onProgress?.({ phase: 'images', current: 0, total: 0 });

  // ── Phase 2: build PDF ──
  const margin = 20; // 2cm — page border position
  const pad = 5; // extra padding between border and content
  const contentMargin = margin + pad;
  const pdf = new jsPDF('p', 'mm', pageSize);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const usableWidth = pdfWidth - 2 * contentMargin;
  const usableHeight = pdfHeight - 2 * contentMargin;
  const bottom = contentMargin + usableHeight;

  let isFirstQuestion = true;

  for (let qi = 0; qi < questions.length; qi++) {
    onProgress?.({ phase: 'rendering', current: qi + 1, total: questions.length });

    if (!isFirstQuestion) pdf.addPage();
    isFirstQuestion = false;

    let y = contentMargin;

    for (let bi = 0; bi < questions[qi].blocks.length; bi++) {
      const block = questions[qi].blocks[bi];

      if (block.type === 'image' && block.imageUrl) {
        const dataUri = imageDataUriMap.get(block.imageUrl);
        if (!dataUri) continue;

        const imgProps = pdf.getImageProperties(dataUri);
        let imgW = usableWidth;
        let imgH = (imgProps.height * imgW) / imgProps.width;

        if (imgH > usableHeight) {
          // Image too tall — scale to fit height
          if (y > contentMargin) { pdf.addPage(); y = contentMargin; }
          const scale = usableHeight / imgH;
          imgW = usableWidth * scale;
          imgH = usableHeight;
          const imgX = contentMargin + (usableWidth - imgW) / 2;
          pdf.addImage(dataUri, 'JPEG', imgX, y, imgW, imgH);
          y = bottom; // force next block to new page
        } else if (y + imgH > bottom) {
          pdf.addPage(); y = contentMargin;
          pdf.addImage(dataUri, 'JPEG', contentMargin, y, imgW, imgH);
          y += imgH + BLOCK_GAP_MM;
        } else {
          pdf.addImage(dataUri, 'JPEG', contentMargin, y, imgW, imgH);
          y += imgH + BLOCK_GAP_MM;
        }
      } else if (block.text != null && block.type !== 'image') {
        const rendered = renderTextBlock(block.text, block.type, usableWidth, block.boxed);

        if (y + rendered.imgH > bottom) {
          pdf.addPage(); y = contentMargin;
        }
        pdf.addImage(rendered.dataUri, 'PNG', contentMargin, y, rendered.imgW, rendered.imgH);
        y += rendered.imgH + BLOCK_GAP_MM;
      }
    }
  }

  // ── Decorate all pages: rounded border + page number + timestamp ──
  const now = new Date();
  const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const pageCount = (pdf as any).internal.pages.length - 1;

  for (let p = 1; p <= pageCount; p++) {
    pdf.setPage(p);

    // Rounded page border
    pdf.setDrawColor(180);
    pdf.setLineWidth(0.4);
    const borderW = pdfWidth - 2 * margin;
    const borderH = pdfHeight - 2 * margin;
    pdf.roundedRect(margin, margin, borderW, borderH, 3, 3, 'S');

    // Footer (rendered via Canvas for CJK support, 8pt)
    const footerText = `第 ${p} 页  ·  ${timeStr}`;
    const footerRendered = renderTextBlock(footerText, 'text', 90, false, 8);
    const footerW = footerRendered.imgW;
    const footerH = footerRendered.imgH;
    const footerX = pdfWidth - margin - footerW;
    const footerY = pdfHeight - margin + 3;
    pdf.addImage(footerRendered.dataUri, 'PNG', footerX, footerY, footerW, footerH);
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
}
