import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generateRedo, submitRedo, updateQuestion } from '@/api/questions';

interface RedoQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export default function Redo() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [q, setQ] = useState<RedoQuestion | null>(null);
  const [sessionId, setSessionId] = useState<number>(0);
  const [selected, setSelected] = useState('');
  const [result, setResult] = useState<{ isCorrect: boolean; correctAnswer: string; explanation: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRedo();
  }, [id]);

  const loadRedo = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    setSelected('');
    try {
      const res = await generateRedo(Number(id));
      setQ(res.data.question);
      setSessionId(res.data.sessionId);
    } catch (err: any) {
      setError(err.message || '生成失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await submitRedo(Number(id), { session_id: sessionId, answer: selected });
      setResult(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    await updateQuestion(Number(id), { status: 'completed' });
    navigate('/');
  };

  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center border-b px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-gray-500">
          ←
        </button>
        <h1 className="mx-auto text-lg font-bold">AI 重做</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {error && <p className="mb-3 text-sm text-danger">{error}</p>}

        {loading && !q && (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="ml-2 text-sm text-gray-500">AI 生成中...</span>
          </div>
        )}

        {q && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-white p-4">
              <div className="text-sm font-medium text-gray-800">{q.question}</div>
            </div>

            <div className="space-y-2">
              {q.options.map((opt, idx) => {
                const label = optionLabels[idx];
                const isSelected = selected === label;
                return (
                  <button
                    key={idx}
                    onClick={() => !result && setSelected(label)}
                    className={`flex w-full items-center rounded-lg border p-3 text-left text-sm ${
                      isSelected ? 'border-primary bg-blue-50 text-primary' : 'border-gray-200 bg-white'
                    } ${result ? 'opacity-70' : ''}`}
                  >
                    <span className="mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-xs font-bold">
                      {label}
                    </span>
                    <span>{opt.replace(/^[A-D]\.\s*/, '')}</span>
                  </button>
                );
              })}
            </div>

            {result && (
              <div className={`rounded-lg p-4 text-sm ${result.isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                <div className="font-bold">{result.isCorrect ? '回答正确！' : '回答错误'}</div>
                <div className="mt-1">正确答案: {result.correctAnswer}</div>
                <div className="mt-2 text-gray-700">{result.explanation}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t p-4">
        {!result && (
          <button
            onClick={handleSubmit}
            disabled={!selected || loading}
            className="w-full rounded-lg bg-primary py-3 font-medium text-white disabled:opacity-60"
          >
            {loading ? '提交中...' : '提交答案'}
          </button>
        )}

        {result && (
          <div className="space-y-2">
            {result.isCorrect ? (
              <button onClick={handleComplete} className="w-full rounded-lg bg-success py-3 font-medium text-white">
                标记为完成
              </button>
            ) : (
              <>
                <button onClick={loadRedo} className="w-full rounded-lg bg-primary py-3 font-medium text-white">
                  重新生成一题
                </button>
                <button onClick={() => navigate(`/questions/${id}/review`)} className="w-full rounded-lg bg-gray-100 py-3 text-sm text-gray-700">
                  返回复盘
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
