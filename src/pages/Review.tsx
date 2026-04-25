import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuestion, submitReview } from '@/api/questions';

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
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center border-b px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-gray-500">
          ←
        </button>
        <h1 className="mx-auto text-lg font-bold">复盘</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {detail.images?.map((img: any) => (
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

        {detail.reason_text && (
          <div className="mb-4 rounded-lg border bg-white p-3">
            <div className="text-xs font-medium text-gray-500">错题原因</div>
            <div className="mt-1 text-sm text-gray-800">{detail.reason_text}</div>
          </div>
        )}

        {detail.tags?.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {detail.tags.map((t: any) => (
              <span key={t.id} className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700">
                {t.name}
              </span>
            ))}
          </div>
        )}

        <div className="mb-4 text-xs text-gray-500">
          <div>章节: {detail.category_name || '-'}</div>
          <div>复习次数: {detail.review_count}</div>
        </div>
      </div>

      <div className="border-t p-4">
        <div className="flex gap-3">
          <button
            onClick={() => handleReview('not_understood')}
            disabled={loading}
            className="flex-1 rounded-lg bg-danger py-3 font-medium text-white disabled:opacity-60"
          >
            我没懂
          </button>
          <button
            onClick={() => handleReview('understood')}
            disabled={loading}
            className="flex-1 rounded-lg bg-success py-3 font-medium text-white disabled:opacity-60"
          >
            我懂了
          </button>
        </div>
      </div>
    </div>
  );
}
