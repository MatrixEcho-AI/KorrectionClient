import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPdfRecords, deletePdfRecord, getPdfUri, type PdfRecord } from '@/utils/pdfExport';
import { NavBar, List, Button, Toast, Dialog, SwipeAction, Empty } from 'antd-mobile';
import { DeleteOutline } from 'antd-mobile-icons';
import { Share } from '@capacitor/share';

export default function PdfHistory() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<PdfRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const list = await getPdfRecords();
      setRecords(list);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (record: PdfRecord) => {
    navigate('/pdf-viewer', { state: { record } });
  };

  const handleShare = async (record: PdfRecord) => {
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

  const handleDelete = (record: PdfRecord) => {
    Dialog.confirm({
      content: '确定删除此PDF？',
      onConfirm: async () => {
        await deletePdfRecord(record.id);
        setRecords((prev) => prev.filter((r) => r.id !== record.id));
        Toast.show({ content: '已删除', icon: 'success' });
      },
    });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NavBar onBack={() => navigate(-1)}>历史PDF</NavBar>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {records.length === 0 && !loading && (
          <div style={{ paddingTop: 60 }}>
            <Empty description="暂无导出的PDF" />
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Button size="small" color="primary" onClick={() => navigate('/export')}>
                去导出
              </Button>
            </div>
          </div>
        )}

        <List>
          {records.map((record) => (
            <SwipeAction
              key={record.id}
              rightActions={[
                {
                  key: 'delete',
                  text: <DeleteOutline />,
                  color: 'danger',
                  onClick: () => handleDelete(record),
                },
              ]}
            >
              <List.Item
                description={`${record.questionCount} 道题 · ${new Date(record.createdAt).toLocaleString()}`}
                onClick={() => handleView(record)}
                extra={
                  <Button
                    size="small"
                    fill="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(record);
                    }}
                  >
                    分享
                  </Button>
                }
              >
                {record.title || `导出 #${record.id}`}
              </List.Item>
            </SwipeAction>
          ))}
        </List>
      </div>
    </div>
  );
}
