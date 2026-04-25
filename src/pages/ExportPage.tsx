import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuestions, type Question } from '@/api/questions';
import { exportPdf } from '@/api/export';

export default function ExportPage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [options, setOptions] = useState({
    originalImage: true,
    originalOcr: true,
    referenceImage: true,
    reason: true,
    tags: true,
    reviewCount: true,
    lastReviewAt: true,
    categoryPath: true,
  });
  const [sort, setSort] = useState({ field: 'created_at', order: 'desc' as 'asc' | 'desc' });
  const [paperSize, setPaperSize] = useState('a4');
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState('');

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    const res = await getQuestions({ pageSize: 500 });
    setQuestions(res.data.list);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleExport = async () => {
    if (selectedIds.length === 0) {
      alert('请至少选择一道题');
      return;
    }
    setLoading(true);
    try {
      const paperMap: Record<string, { name?: string; width?: number; height?: number }> = {
        a4: { name: 'A4' },
        a5: { name: 'A5' },
        letter: { name: 'Letter' },
      };
      const res = await exportPdf({
        question_ids: selectedIds,
        options,
        sort,
        paperSize: paperMap[paperSize] || { name: 'A4' },
      });
      setResultUrl(res.data.url);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const optionLabels: Record<string, string> = {
    originalImage: '原题图片',
    originalOcr: 'OCR 文本',
    referenceImage: '参考答案图',
    reason: '错题原因',
    tags: '标签',
    reviewCount: '复习次数',
    lastReviewAt: '最后复盘时间',
    categoryPath: '章节路径',
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center border-b px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-gray-500">
          ←
        </button>
        <h1 className="mx-auto text-lg font-bold">导出 PDF</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4">
          <div className="mb-2 text-sm font-medium">选择题目 ({selectedIds.length})</div>
          <div className="max-h-40 overflow-y-auto rounded-lg border bg-white">
            {questions.map((q) => (
              <label key={q.id} className="flex items-center gap-2 border-b px-3 py-2 text-sm last:border-b-0">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(q.id)}
                  onChange={() => toggleSelect(q.id)}
                />
                <span className="flex-1 truncate">题目 #{q.id}</span>
                <span className="text-xs text-gray-400">{q.category_name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-2 text-sm font-medium">包含内容</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(optionLabels).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={(options as any)[key]}
                  onChange={(e) => setOptions((prev) => ({ ...prev, [key]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-2 text-sm font-medium">排序</div>
          <div className="flex gap-2">
            <select
              value={sort.field}
              onChange={(e) => setSort((s) => ({ ...s, field: e.target.value }))}
              className="rounded-lg border px-2 py-1 text-sm"
            >
              <option value="created_at">创建时间</option>
              <option value="review_count">复习次数</option>
              <option value="last_review_at">最后复盘</option>
            </select>
            <select
              value={sort.order}
              onChange={(e) => setSort((s) => ({ ...s, order: e.target.value as 'asc' | 'desc' }))}
              className="rounded-lg border px-2 py-1 text-sm"
            >
              <option value="desc">降序</option>
              <option value="asc">升序</option>
            </select>
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-2 text-sm font-medium">纸张</div>
          <select
            value={paperSize}
            onChange={(e) => setPaperSize(e.target.value)}
            className="rounded-lg border px-2 py-1 text-sm"
          >
            <option value="a4">A4</option>
            <option value="a5">A5</option>
            <option value="letter">Letter</option>
          </select>
        </div>

        {resultUrl && (
          <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm">
            <div className="font-medium text-green-800">导出成功</div>
            <a href={resultUrl} target="_blank" rel="noreferrer" className="break-all text-primary underline">
              {resultUrl}
            </a>
          </div>
        )}
      </div>

      <div className="border-t p-4">
        <button
          onClick={handleExport}
          disabled={loading}
          className="w-full rounded-lg bg-primary py-3 font-medium text-white disabled:opacity-60"
        >
          {loading ? '生成中...' : '导出 PDF'}
        </button>
      </div>
    </div>
  );
}
