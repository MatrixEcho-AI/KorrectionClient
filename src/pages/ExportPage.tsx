import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuestions, type Question } from '@/api/questions';
import { exportPdf } from '@/api/export';
import { useSubjectStore } from '@/stores/subjectStore';
import { NavBar, List, Button, Checkbox, Toast, SpinLoading, Picker } from 'antd-mobile';

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

export default function ExportPage() {
  const navigate = useNavigate();
  const { currentSubjectId } = useSubjectStore();
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
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [paperSize, setPaperSize] = useState('a4');
  const [loading, setLoading] = useState(false);
  const [resultUrl, setResultUrl] = useState('');
  const [listLoading, setListLoading] = useState(false);
  const [sortPickerVisible, setSortPickerVisible] = useState(false);
  const [orderPickerVisible, setOrderPickerVisible] = useState(false);
  const [paperPickerVisible, setPaperPickerVisible] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, [currentSubjectId]);

  const loadQuestions = async () => {
    setListLoading(true);
    try {
      const res = await getQuestions({
        subject_id: currentSubjectId || undefined,
        pageSize: 500,
      });
      setQuestions(res.data.list);
    } finally {
      setListLoading(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === questions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(questions.map((q) => q.id));
    }
  };

  const handleExport = async () => {
    if (selectedIds.length === 0) {
      Toast.show({ content: '请至少选择一道题', icon: 'fail' });
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
        sort: { field: sortField, order: sortOrder },
        paperSize: paperMap[paperSize] || { name: 'A4' },
      });
      setResultUrl(res.data.url);
      Toast.show({ content: '导出成功', icon: 'success' });
    } catch (err: any) {
      Toast.show({ content: err.message || '导出失败', icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  const sortFieldOptions = [
    { label: '创建时间', value: 'created_at' },
    { label: '复习次数', value: 'review_count' },
    { label: '最后复盘', value: 'last_review_at' },
  ];

  const sortOrderOptions = [
    { label: '降序', value: 'desc' },
    { label: '升序', value: 'asc' },
  ];

  const paperSizeOptions = [
    { label: 'A4', value: 'a4' },
    { label: 'A5', value: 'a5' },
    { label: 'Letter', value: 'letter' },
  ];

  const sortFieldLabel = sortFieldOptions.find((o) => o.value === sortField)?.label || '创建时间';
  const sortOrderLabel = sortOrderOptions.find((o) => o.value === sortOrder)?.label || '降序';
  const paperSizeLabel = paperSizeOptions.find((o) => o.value === paperSize)?.label || 'A4';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NavBar onBack={() => navigate(-1)}>导出 PDF</NavBar>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        <List header={`选择题目 (${selectedIds.length}/${questions.length})`}>
          <List.Item
            prefix={<Checkbox checked={selectedIds.length === questions.length && questions.length > 0} onChange={toggleAll} />}
            onClick={toggleAll}
          >
            全选
          </List.Item>
          {questions.map((q) => (
            <List.Item
              key={q.id}
              prefix={
                <Checkbox
                  checked={selectedIds.includes(q.id)}
                  onChange={() => toggleSelect(q.id)}
                />
              }
              onClick={() => toggleSelect(q.id)}
              extra={<span style={{ fontSize: 12, color: '#999' }}>{q.category_name}</span>}
            >
              <span style={{ fontSize: 14 }}>题目 #{q.id}</span>
            </List.Item>
          ))}
        </List>

        {listLoading && (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <SpinLoading color="primary" />
          </div>
        )}

        <List header="包含内容" style={{ marginTop: 12 }}>
          {Object.entries(optionLabels).map(([key, label]) => (
            <List.Item
              key={key}
              prefix={
                <Checkbox
                  checked={(options as any)[key]}
                  onChange={(checked) => setOptions((prev) => ({ ...prev, [key]: checked }))}
                />
              }
              onClick={() => setOptions((prev) => ({ ...prev, [key]: !((prev as any)[key]) }))}
            >
              {label}
            </List.Item>
          ))}
        </List>

        <List header="排序" style={{ marginTop: 12 }}>
          <List.Item
            extra={sortFieldLabel}
            onClick={() => setSortPickerVisible(true)}
            arrow
          >
            排序字段
          </List.Item>
          <List.Item
            extra={sortOrderLabel}
            onClick={() => setOrderPickerVisible(true)}
            arrow
          >
            排序方向
          </List.Item>
        </List>

        <List header="纸张" style={{ marginTop: 12 }}>
          <List.Item
            extra={paperSizeLabel}
            onClick={() => setPaperPickerVisible(true)}
            arrow
          >
            纸张尺寸
          </List.Item>
        </List>

        {resultUrl && (
          <div style={{ marginTop: 12, padding: 12, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
            <div style={{ fontWeight: 500, color: '#389e0d', marginBottom: 4 }}>导出成功</div>
            <a href={resultUrl} target="_blank" rel="noreferrer" style={{ color: '#1677ff', fontSize: 12, wordBreak: 'break-all' }}>
              {resultUrl}
            </a>
          </div>
        )}
      </div>

      <div style={{ padding: 12, borderTop: '1px solid #eee' }}>
        <Button block color="primary" size="large" loading={loading} onClick={handleExport}>
          {loading ? '生成中...' : '导出 PDF'}
        </Button>
      </div>

      <Picker
        columns={[sortFieldOptions]}
        visible={sortPickerVisible}
        onClose={() => setSortPickerVisible(false)}
        value={[sortField]}
        onConfirm={(v) => { setSortField(v[0] as string); setSortPickerVisible(false); }}
        title="排序字段"
      />
      <Picker
        columns={[sortOrderOptions]}
        visible={orderPickerVisible}
        onClose={() => setOrderPickerVisible(false)}
        value={[sortOrder]}
        onConfirm={(v) => { setSortOrder(v[0] as 'asc' | 'desc'); setOrderPickerVisible(false); }}
        title="排序方向"
      />
      <Picker
        columns={[paperSizeOptions]}
        visible={paperPickerVisible}
        onClose={() => setPaperPickerVisible(false)}
        value={[paperSize]}
        onConfirm={(v) => { setPaperSize(v[0] as string); setPaperPickerVisible(false); }}
        title="纸张尺寸"
      />
    </div>
  );
}
