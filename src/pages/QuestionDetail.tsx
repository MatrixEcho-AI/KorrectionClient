import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuestion, deleteQuestion, type Question } from '@/api/questions';
import { NavBar, Button, SpinLoading, Image, Tag, Toast, Dialog } from 'antd-mobile';

const statusMap: Record<string, string> = {
  photo: '拍照',
  summary: '总结',
  review: '复盘',
  redo: '重做',
  completed: '完成',
};

const typeLabel: Record<string, string> = {
  original_question: '原题',
  wrong_solution: '错解',
  reference_answer: '参考答案',
};

export default function QuestionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [q, setQ] = useState<Question | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getQuestion(Number(id));
      setQ(res.data);
      setDetail(res.data);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <SpinLoading color="primary" />
      </div>
    );
  }

  if (!q) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#999' }}>题目不存在</div>
        <Button style={{ marginTop: 16 }} onClick={() => navigate('/')}>返回首页</Button>
      </div>
    );
  }

  const nextAction = () => {
    switch (q.status) {
      case 'photo':
        navigate(`/questions/${id}/summary`);
        break;
      case 'summary':
        navigate(`/questions/${id}/review`);
        break;
      case 'review':
      case 'redo':
      case 'completed':
        navigate(`/questions/${id}/review`);
        break;
    }
  };

  const handleDelete = async () => {
    const result = await Dialog.confirm({ content: '确定删除这道题？可在回收站恢复。' });
    if (!result) return;
    await deleteQuestion(Number(id));
    Toast.show({ content: '已删除', icon: 'success' });
    navigate('/');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NavBar
        onBack={() => navigate(-1)}
        right={
          <Tag color="default" fill="outline">{statusMap[q.status]}</Tag>
        }
      >
        题目详情
      </NavBar>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {detail?.images?.map((img: any) => (
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

        {q.reason_text && (
          <div style={{ marginBottom: 16, borderRadius: 8, border: '1px solid #eee', padding: 12, background: '#fff' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#666' }}>错题原因</div>
            <div style={{ marginTop: 4, fontSize: 14, color: '#333' }}>{q.reason_text}</div>
          </div>
        )}

        {detail?.tags?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {detail.tags.map((t: any) => (
              <Tag key={t.id} color="primary" fill="outline">{t.name}</Tag>
            ))}
          </div>
        )}

        <div style={{ fontSize: 12, color: '#999' }}>
          <div>章节: {q.category_name || '-'}</div>
          <div>复习次数: {q.review_count}</div>
          <div>最后复盘: {q.last_review_at ? new Date(q.last_review_at).toLocaleString() : '-'}</div>
        </div>
      </div>

      <div style={{ padding: 12, borderTop: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Button block color="primary" size="large" onClick={nextAction}>
          {q.status === 'photo' && '去总结'}
          {q.status === 'summary' && '去复盘'}
          {(q.status === 'review' || q.status === 'redo' || q.status === 'completed') && '复盘 / 重做'}
        </Button>
        <Button block fill="outline" size="large" style={{ color: '#ff3141' }} onClick={handleDelete}>
          删除题目
        </Button>
      </div>
    </div>
  );
}
