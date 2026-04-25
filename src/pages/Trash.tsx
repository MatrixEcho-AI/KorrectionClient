import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuestions, restoreQuestion, permanentDeleteQuestion, type Question } from '@/api/questions';

export default function Trash() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getQuestions({ status: 'deleted', pageSize: 500 });
      setQuestions(res.data.list);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: number) => {
    await restoreQuestion(id);
    await load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('彻底删除后无法恢复，确定吗？')) return;
    await permanentDeleteQuestion(id);
    await load();
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center border-b px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-gray-500">
          ←
        </button>
        <h1 className="mx-auto text-lg font-bold">回收站</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {questions.length === 0 && !loading && (
          <div className="mt-20 text-center text-gray-400">回收站为空</div>
        )}

        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.id} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="mb-2 text-sm text-gray-500">题目 #{q.id}</div>
              <div className="text-xs text-gray-400">{new Date(q.created_at).toLocaleDateString()}</div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handleRestore(q.id)}
                  className="flex-1 rounded-lg bg-primary py-2 text-sm text-white"
                >
                  恢复
                </button>
                <button
                  onClick={() => handleDelete(q.id)}
                  className="flex-1 rounded-lg bg-danger py-2 text-sm text-white"
                >
                  彻底删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
