import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NavBar, Toast } from 'antd-mobile';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { getPdfUri, type PdfRecord } from '@/utils/pdfExport';

export default function PdfViewer() {
  const navigate = useNavigate();
  const location = useLocation();
  const record = location.state?.record as PdfRecord | undefined;
  const [webUri, setWebUri] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!record) {
      setError('无效的 PDF');
      return;
    }
    (async () => {
      try {
        const uri = await getPdfUri(record.id);
        setWebUri(Capacitor.convertFileSrc(uri));
      } catch (err: any) {
        setError('无法加载 PDF');
        Toast.show({ content: '加载失败', icon: 'fail' });
      }
    })();
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
      <div style={{ flex: 1, minHeight: 0 }}>
        {webUri ? (
          <iframe
            src={webUri}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="PDF Preview"
          />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
            加载中...
          </div>
        )}
      </div>
    </div>
  );
}
