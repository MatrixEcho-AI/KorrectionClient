import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuestions, type Question } from '@/api/questions';
import { exportData } from '@/api/export';
import { useSubjectStore } from '@/stores/subjectStore';
import { generateAndSavePdf, type PdfRecord } from '@/utils/pdfExport';
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
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [sortPickerVisible, setSortPickerVisible] = useState(false);
  const [orderPickerVisible, setOrderPickerVisible] = useState(false);
  const [printQuestions, setPrintQuestions] = useState<any[]>([]);
  const [printOptions, setPrintOptions] = useState<Record<string, boolean> | null>(null);
  const [lastRecord, setLastRecord] = useState<PdfRecord | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

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
      const res = await exportData({
        question_ids: selectedIds,
        options,
        sort: { field: sortField, order: sortOrder },
      });
      setPrintQuestions(res.data.questions);
      setPrintOptions(res.data.options);

      setTimeout(async () => {
        if (!printRef.current) {
          setLoading(false);
          return;
        }
        try {
          const record = await generateAndSavePdf(
            printRef.current,
            `错题导出 (${selectedIds.length}题)`,
            selectedIds.length
          );
          setLastRecord(record);
          Toast.show({ content: 'PDF已保存到本地', icon: 'success' });
        } catch (err: any) {
          console.error('PDF生成失败:', err);
          Toast.show({ content: 'PDF生成失败: ' + (err.message || ''), icon: 'fail' });
        } finally {
          setLoading(false);
        }
      }, 300);
    } catch (err: any) {
      Toast.show({ content: err.message || '导出失败', icon: 'fail' });
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

  const sortFieldLabel = sortFieldOptions.find((o) => o.value === sortField)?.label || '创建时间';
  const sortOrderLabel = sortOrderOptions.find((o) => o.value === sortOrder)?.label || '降序';

  const renderPrintContent = () => {
    if (!printQuestions.length || !printOptions) return null;

    const include = {
      originalImage: printOptions.originalImage !== false,
      originalOcr: printOptions.originalOcr !== false,
      referenceImage: printOptions.referenceImage !== false,
      reason: printOptions.reason !== false,
      tags: printOptions.tags !== false,
      reviewCount: printOptions.reviewCount !== false,
      lastReviewAt: printOptions.lastReviewAt !== false,
      categoryPath: printOptions.categoryPath !== false,
    };

    return (
      <div
        ref={printRef}
        style={{
          position: 'fixed',
          left: -9999,
          top: 0,
          width: 794,
          background: '#fff',
          padding: 24,
        }}
      >
        {printQuestions.map((q, idx) => {
          const origImages = q.images?.filter((i: any) => i.image_type === 'original_question') || [];
          const refImages = q.images?.filter((i: any) => i.image_type === 'reference_answer') || [];

          return (
            <div key={q.id} style={{ pageBreakInside: 'avoid', marginBottom: 24, borderBottom: '1px solid #eee', paddingBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#111' }}>题目 {idx + 1}</div>
              {include.originalImage && origImages.map((img: any) => (
                <div key={img.id}>
                  <img src={img.image_url} style={{ maxWidth: '100%', display: 'block', margin: '8px 0', border: '1px solid #ddd', borderRadius: 4 }} alt="" crossOrigin="anonymous" />
                  {include.originalOcr && img.ocr_text && (
                    <div style={{ background: '#f8f9fa', padding: 8, borderRadius: 4, margin: '6px 0', fontSize: 13, color: '#555', whiteSpace: 'pre-wrap' }}>{img.ocr_text}</div>
                  )}
                </div>
              ))}
              {include.referenceImage && refImages.map((img: any) => (
                <img key={img.id} src={img.image_url} style={{ maxWidth: '100%', display: 'block', margin: '8px 0', border: '1px solid #ddd', borderRadius: 4 }} alt="" crossOrigin="anonymous" />
              ))}
              {include.reason && q.reason_text && (
                <div style={{ margin: '4px 0', fontSize: 13, color: '#444' }}><strong>错题原因:</strong> {q.reason_text}</div>
              )}
              {include.tags && q.tags?.length > 0 && (
                <div style={{ margin: '4px 0', fontSize: 13, color: '#444' }}><strong>标签:</strong> {q.tags.join(', ')}</div>
              )}
              {include.reviewCount && (
                <div style={{ margin: '4px 0', fontSize: 13, color: '#444' }}><strong>复习次数:</strong> {q.reviewCount}</div>
              )}
              {include.lastReviewAt && (
                <div style={{ margin: '4px 0', fontSize: 13, color: '#444' }}><strong>最后复盘:</strong> {q.lastReviewAt}</div>
              )}
              {include.categoryPath && q.category_name && (
                <div style={{ margin: '4px 0', fontSize: 13, color: '#444' }}><strong>章节:</strong> {q.category_name}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NavBar onBack={() => navigate(-1)}>导出 PDF</NavBar>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: 12 }}>
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

        {lastRecord && (
          <div style={{ marginTop: 12, padding: 12, background: '#f6ffed', borderRadius: 8, border: '1px solid #b7eb8f' }}>
            <div style={{ fontWeight: 500, color: '#389e0d', marginBottom: 4 }}>导出成功</div>
            <div style={{ fontSize: 12, color: '#666' }}>{lastRecord.title}</div>
            <Button size="small" color="primary" fill="outline" style={{ marginTop: 8 }} onClick={() => navigate('/pdf-history')}>
              查看历史PDF
            </Button>
          </div>
        )}

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
      </div>

      <div style={{ padding: 12, borderTop: '1px solid #eee' }}>
        <Button block color="primary" size="large" loading={loading} onClick={handleExport}>
          {loading ? '生成中...' : '导出 PDF'}
        </Button>
      </div>

      {renderPrintContent()}
    </div>
  );
}
