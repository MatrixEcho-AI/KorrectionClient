import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuestions, submitReview } from '@/api/questions';
import { NavBar, Button, SpinLoading, Image, Tag, Toast, Dialog } from 'antd-mobile';

const typeLabel: Record<string, string> = {
  original_question: '原题',
  wrong_solution: '错解',
  reference_answer: '参考答案',
};

interface ReviewQuestion {
  id: number;
  status: string;
  reason_text?: string;
  category_name?: string;
  review_count: number;
  images?: { id: number; image_url: string; image_type: string; ocr_text?: string }[];
  tags?: { id: number; name: string }[];
}

export default function BatchReview() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setInitialLoading(true);
    try {
      const res = await getQuestions({ status: 'summary,review', pageSize: 1000 });
      const list = res.data.list.filter((q: any) => q.status === 'summary' || q.status === 'review');
      setQuestions(list);
    } finally {
      setInitialLoading(false);
    }
  };

  const current = questions[currentIndex];

  const handleReview = async (action: 'understood' | 'not_understood') => {
    if (!current) return;
    setLoading(true);
    try {
      await submitReview(current.id, action);
      Toast.show({ content: action === 'understood' ? '已标记为懂了' : '已标记为没懂', icon: 'success' });
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        await Dialog.alert({ content: '所有题目已复盘完成' });
        navigate('/');
      }
    } catch (err: any) {
      Toast.show({ content: err.message || '提交失败', icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <SpinLoading color="primary" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#999' }}>暂无待复盘的题目</div>
        <Button style={{ marginTop: 16 }} onClick={() => navigate('/')}>返回首页</Button>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NavBar onBack={() => navigate(-1)}>
        批量复盘 ({currentIndex + 1}/{questions.length})
      </NavBar>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {current.images?.map((img) => (
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

        {current.reason_text && (
          <div style={{ marginBottom: 16, borderRadius: 8, border: '1px solid #eee', padding: 12, background: '#fff' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#666' }}>错题原因</div>
            <div style={{ marginTop: 4, fontSize: 14, color: '#333' }}>{current.reason_text}</div>
          </div>
        )}

        {current.tags && current.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {current.tags.map((t) => (
              <Tag key={t.id} color="primary" fill="outline">{t.name}</Tag>
            ))}
          </div>
        )}

        <div style={{ fontSize: 12, color: '#999' }}>
          <div>章节: {current.category_name || '-'}</div>
          <div>复习次数: {current.review_count}</div>
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
