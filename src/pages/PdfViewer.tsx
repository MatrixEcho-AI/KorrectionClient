import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NavBar, Toast, SpinLoading } from 'antd-mobile';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerSource from 'pdfjs-dist/build/pdf.worker.min.mjs?raw';
import { getPdfUri, type PdfRecord } from '@/utils/pdfExport';

const workerBlob = new Blob([pdfjsWorkerSource], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(workerBlob);
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfViewer() {
  const navigate = useNavigate();
  const location = useLocation();
  const record = location.state?.record as PdfRecord | undefined;
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!record) {
      setError('无效的 PDF');
      setLoading(false);
      return;
    }

    let cancelled = false;
    const canvases: HTMLCanvasElement[] = [];

    (async () => {
      try {
        const result = await Filesystem.readFile({
          path: `exports/${record.id}.pdf`,
          directory: Directory.Documents,
        });
        const base64 = result.data as string;
        const raw = atob(base64);
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) {
          bytes[i] = raw.charCodeAt(i);
        }

        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;

        if (cancelled) return;

        const container = containerRef.current;
        if (!container) return;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.style.display = 'block';
          canvas.style.margin = '0 auto 8px auto';
          canvas.style.maxWidth = '100%';
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvas, viewport }).promise;

          if (cancelled) return;
          container.appendChild(canvas);
          canvases.push(canvas);
        }

        if (!cancelled) setLoading(false);
      } catch (err: any) {
        if (!cancelled) {
          console.error('PDF render error:', err);
          setError('无法加载 PDF');
          Toast.show({ content: '加载失败', icon: 'fail' });
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      for (const c of canvases) c.remove();
    };
  }, [record]);

  const handleShare = async () => {
    if (!record) return;
    try {
      const uri = await getPdfUri(record.id);
      await Share.share({
        title: record.title,
        files: [uri],
      });
    } catch (err: any) {
      if (err.message !== 'Share canceled') {
        Toast.show({ content: '分享失败', icon: 'fail' });
      }
    }
  };

  if (error) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <NavBar onBack={() => navigate(-1)}>PDF 预览</NavBar>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NavBar
        onBack={() => navigate(-1)}
        right={
          <span style={{ color: '#1677ff', fontSize: 14 }} onClick={handleShare}>
            分享
          </span>
        }
      >
        PDF 预览
      </NavBar>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 8 }}>
        {loading && (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SpinLoading color="primary" />
          </div>
        )}
        <div ref={containerRef} />
      </div>
    </div>
  );
}
