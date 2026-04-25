import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generateRedo, submitRedo, updateQuestion } from '@/api/questions';
import { NavBar, Button, SpinLoading, Toast, Card } from 'antd-mobile';

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
      Toast.show({ content: err.message, icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    await updateQuestion(Number(id), { status: 'completed' });
    Toast.show({ content: '已完成', icon: 'success' });
    navigate('/');
  };

  const optionLabels = ['A', 'B', 'C', 'D'];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NavBar onBack={() => navigate(-1)}>AI 重做</NavBar>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {error && <div style={{ marginBottom: 12, color: '#ff3141', fontSize: 14 }}>{error}</div>}

        {loading && !q && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
            <SpinLoading color="primary" />
            <span style={{ marginLeft: 8, fontSize: 14, color: '#999' }}>AI 生成中...</span>
          </div>
        )}

        {q && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Card>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>{q.question}</div>
            </Card>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {q.options.map((opt, idx) => {
                const label = optionLabels[idx];
                const isSelected = selected === label;
                return (
                  <div
                    key={idx}
                    onClick={() => !result && setSelected(label)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: 12,
                      borderRadius: 8,
                      border: isSelected ? '1px solid #1677ff' : '1px solid #eee',
                      background: isSelected ? '#f0f5ff' : '#fff',
                      color: isSelected ? '#1677ff' : '#333',
                      opacity: result ? 0.7 : 1,
                    }}
                  >
                    <span style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      border: '1px solid #ccc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      marginRight: 12,
                      flexShrink: 0,
                    }}>{label}</span>
                    <span style={{ fontSize: 14 }}>{opt.replace(/^[A-D]\.\s*/, '')}</span>
                  </div>
                );
              })}
            </div>

            {result && (
              <div style={{
                padding: 16,
                borderRadius: 8,
                background: result.isCorrect ? '#f6ffed' : '#fff2f0',
                color: result.isCorrect ? '#389e0d' : '#cf1322',
                fontSize: 14,
              }}>
                <div style={{ fontWeight: 700 }}>{result.isCorrect ? '回答正确！' : '回答错误'}</div>
                <div style={{ marginTop: 4 }}>正确答案: {result.correctAnswer}</div>
                <div style={{ marginTop: 8, color: '#333' }}>{result.explanation}</div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: 12, borderTop: '1px solid #eee' }}>
        {!result && (
          <Button block color="primary" size="large" loading={loading} disabled={!selected} onClick={handleSubmit}>
            {loading ? '提交中...' : '提交答案'}
          </Button>
        )}

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {result.isCorrect ? (
              <Button block color="primary" size="large" onClick={handleComplete}>
                标记为完成
              </Button>
            ) : (
              <>
                <Button block color="primary" size="large" onClick={loadRedo}>
                  重新生成一题
                </Button>
                <Button block fill="outline" size="large" onClick={() => navigate(`/questions/${id}/review`)}>
                  返回复盘
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
