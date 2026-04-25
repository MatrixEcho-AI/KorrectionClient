import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuestion, deleteQuestion, type Question } from '@/api/questions';

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
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!q) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <p className="text-gray-400">题目不存在</p>
        <button onClick={() => navigate('/')} className="mt-4 text-primary">
          返回首页
        </button>
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
    if (!confirm('确定删除这道题？可在回收站恢复。')) return;
    await deleteQuestion(Number(id));
    navigate('/');
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center border-b px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-gray-500">
          ←
        </button>
        <h1 className="mx-auto text-lg font-bold">题目详情</h1>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {statusMap[q.status]}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {detail?.images?.map((img: any) => (
          <div key={img.id} className="mb-4 rounded-lg border bg-white p-3">
            <div className="mb-1 text-xs font-medium text-gray-500">{typeLabel[img.image_type]}</div>
            <img src={img.image_url} alt="" className="h-48 w-full rounded-md object-contain" />
            {img.ocr_text && (
              <div className="mt-2 rounded bg-gray-50 p-2 text-xs text-gray-600 whitespace-pre-wrap">
                {img.ocr_text}
              </div>
            )}
          </div>
        ))}

        {q.reason_text && (
          <div className="mb-4 rounded-lg border bg-white p-3">
            <div className="text-xs font-medium text-gray-500">错题原因</div>
            <div className="mt-1 text-sm text-gray-800">{q.reason_text}</div>
          </div>
        )}

        {detail?.tags?.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {detail.tags.map((t: any) => (
              <span key={t.id} className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                {t.name}
              </span>
            ))}
          </div>
        )}

        <div className="mb-4 text-xs text-gray-500">
          <div>章节: {q.category_name || '-'}</div>
          <div>复习次数: {q.review_count}</div>
          <div>最后复盘: {q.last_review_at ? new Date(q.last_review_at).toLocaleString() : '-'}</div>
        </div>
      </div>

      <div className="border-t p-4 space-y-2">
        <button onClick={nextAction} className="w-full rounded-lg bg-primary py-3 font-medium text-white">
          {q.status === 'photo' && '去总结'}
          {q.status === 'summary' && '去复盘'}
          {(q.status === 'review' || q.status === 'redo' || q.status === 'completed') && '复盘 / 重做'}
        </button>
        <button onClick={handleDelete} className="w-full rounded-lg bg-gray-100 py-2 text-sm text-danger">
          删除题目
        </button>
      </div>
    </div>
  );
}
