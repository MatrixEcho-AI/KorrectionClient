import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuestion, submitReview } from '@/api/questions';
import { NavBar, Button, SpinLoading, Image, Tag, Toast } from 'antd-mobile';

const typeLabel: Record<string, string> = {
  original_question: '原题',
  wrong_solution: '错解',
  reference_answer: '参考答案',
};

export default function Review() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    const res = await getQuestion(Number(id));
    setDetail(res.data);
  };

  const handleReview = async (action: 'understood' | 'not_understood') => {
    setLoading(true);
    try {
      await submitReview(Number(id), action);
      Toast.show({ content: action === 'understood' ? '已标记为懂了' : '已标记为没懂', icon: 'success' });
      if (action === 'understood') {
        navigate(`/questions/${id}/redo`);
      } else {
        await load();
      }
    } finally {
      setLoading(false);
    }
  };

  if (!detail) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <SpinLoading color="primary" />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NavBar onBack={() => navigate(-1)}>复盘</NavBar>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {detail.images?.map((img: any) => (
          <div key={img.id} style={{ marginBottom: 16, borderRadius: 8, border: '1px solid #eee', padding: 12, background: '#fff' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#666', marginBottom: 8 }}>{typeLabel[img.image_type]}</div>
            <Image src={img.image_url} style={{ width: '100%', maxHeight: 192, borderRadius: 4 }} fit="contain" />
            {img.ocr_text && (
              <div style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4, fontSize: 12, color: '#666', whiteSpace: 'pre-wrap' }}>
                {img.ocr_text}
              </div>
            )}
          </div>
        ))}

        {detail.reason_text && (
          <div style={{ marginBottom: 16, borderRadius: 8, border: '1px solid #eee', padding: 12, background: '#fff' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#666' }}>错题原因</div>
            <div style={{ marginTop: 4, fontSize: 14, color: '#333' }}>{detail.reason_text}</div>
          </div>
        )}

        {detail.tags?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {detail.tags.map((t: any) => (
              <Tag key={t.id} color="primary" fill="outline">{t.name}</Tag>
            ))}
          </div>
        )}

        <div style={{ fontSize: 12, color: '#999' }}>
          <div>章节: {detail.category_name || '-'}</div>
          <div>复习次数: {detail.review_count}</div>
        </div>
      </div>

      <div style={{ padding: 12, borderTop: '1px solid #eee', display: 'flex', gap: 12 }}>
        <Button block color="danger" size="large" loading={loading} onClick={() => handleReview('not_understood')}>
          我没懂
        </Button>
        <Button block color="primary" size="large" loading={loading} onClick={() => handleReview('understood')}>
          我懂了
        </Button>
      </div>
    </div>
  );
}
