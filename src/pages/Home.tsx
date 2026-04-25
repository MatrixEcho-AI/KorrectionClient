import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuestions, type Question } from '@/api/questions';
import { useAuthStore } from '@/stores/authStore';
import { useCategoryStore } from '@/stores/categoryStore';

const statusMap: Record<string, string> = {
  photo: '拍照',
  summary: '总结',
  review: '复盘',
  redo: '重做',
  completed: '完成',
};

const statusColor: Record<string, string> = {
  photo: 'bg-gray-100 text-gray-600',
  summary: 'bg-blue-50 text-blue-600',
  review: 'bg-yellow-50 text-yellow-700',
  redo: 'bg-purple-50 text-purple-700',
  completed: 'bg-green-50 text-green-700',
};

export default function Home() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const { fetch: fetchCategories } = useCategoryStore();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    loadQuestions(1);
  }, [statusFilter]);

  const loadQuestions = async (p: number) => {
    setLoading(true);
    try {
      const res = await getQuestions({
        status: statusFilter || undefined,
        page: p,
        pageSize,
      });
      setQuestions((prev) => (p === 1 ? res.data.list : [...prev, ...res.data.list]));
      setTotal(res.data.total);
      setPage(p);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50 && !loading && questions.length < total) {
      loadQuestions(page + 1);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="text-lg font-bold">我的错题</h1>
        <div className="flex gap-3">
          <button onClick={() => navigate('/export')} className="text-sm text-primary">
            导出
          </button>
          <button onClick={() => navigate('/categories')} className="text-sm text-primary">
            分类
          </button>
          <button onClick={() => navigate('/trash')} className="text-sm text-secondary">
            回收站
          </button>
          <button onClick={logout} className="text-sm text-secondary">
            退出
          </button>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto border-b px-4 py-2">
        {['', 'photo', 'summary', 'review', 'redo', 'completed'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${
              statusFilter === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {s ? statusMap[s] : '全部'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4" onScroll={handleScroll}>
        {questions.length === 0 && !loading && (
          <div className="mt-20 text-center text-gray-400">暂无错题</div>
        )}

        <div className="space-y-3">
          {questions.map((q) => (
            <div
              key={q.id}
              onClick={() => navigate(`/questions/${q.id}`)}
              className="cursor-pointer rounded-lg border bg-white p-4 shadow-sm active:scale-[0.99]"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[q.status]}`}>
                  {statusMap[q.status]}
                </span>
                <span className="text-xs text-gray-400">{new Date(q.created_at).toLocaleDateString()}</span>
              </div>
              <div className="text-sm text-gray-700">
                {q.images && q.images.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto">
                    {q.images.map((img) => (
                      <img
                        key={img.id}
                        src={img.image_url}
                        alt=""
                        className="h-20 w-20 flex-shrink-0 rounded-md object-cover"
                      />
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-400">暂无图片</span>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {q.category_name || '-'} · 复习 {q.review_count} 次
              </div>
              {q.tags && q.tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {q.tags.map((t) => (
                    <span key={t.id} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                      {t.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {loading && (
          <div className="py-4 text-center">
            <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      <div className="border-t p-4">
        <button
          onClick={() => navigate('/questions/new')}
          className="w-full rounded-lg bg-primary py-3 font-medium text-white"
        >
          + 拍照录入
        </button>
      </div>
    </div>
  );
}
