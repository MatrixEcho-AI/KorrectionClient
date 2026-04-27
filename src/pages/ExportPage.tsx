import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuestions, type Question } from '@/api/questions';
import { exportData } from '@/api/export';
import { getCategories, type Category } from '@/api/categories';
import { getTags, type Tag } from '@/api/tags';
import { useSubjectStore } from '@/stores/subjectStore';
import { generateAndSavePdf, type PdfRecord, type PageSize, type ProgressInfo, type PrintQuestion, type PrintBlock } from '@/utils/pdfExport';
import { NavBar, List, Button, Checkbox, Toast, SpinLoading, Picker, Cascader } from 'antd-mobile';

interface OptionGroup {
  title: string;
  keys: string[];
}

const optionLabels: Record<string, string> = {
  originalImage: '原题图片',
  originalOcr: '原题OCR',
  wrongSolutionImage: '错解图片',
  wrongSolutionOcr: '错解OCR',
  referenceImage: '参考答案图',
  referenceOcr: '参考答案OCR',
  reason: '错题原因',
  tags: '标签',
  reviewCount: '复习次数',
  lastReviewAt: '最后复盘时间',
  categoryPath: '章节路径',
};

const optionGroups: OptionGroup[] = [
  { title: '原题', keys: ['originalImage', 'originalOcr'] },
  { title: '错解', keys: ['wrongSolutionImage', 'wrongSolutionOcr'] },
  { title: '参考答案', keys: ['referenceImage', 'referenceOcr'] },
  { title: '其他', keys: ['reason', 'tags', 'reviewCount', 'lastReviewAt', 'categoryPath'] },
];

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '总结', value: 'summary' },
  { label: '复习', value: 'review' },
  { label: '重做', value: 'redo' },
  { label: '已完成', value: 'completed' },
];

function buildCascaderOptions(categories: { id: number; parent_id: number; name: string }[]) {
  const map = new Map<number, { label: string; value: string; children: any[] }>();
  categories.forEach((c) => map.set(c.id, { label: c.name, value: String(c.id), children: [] }));
  const roots: any[] = [];
  categories.forEach((c) => {
    if (c.parent_id === 0) {
      roots.push(map.get(c.id)!);
    } else {
      const parent = map.get(c.parent_id);
      if (parent) {
        parent.children.push(map.get(c.id)!);
      }
    }
  });
  const clean = (nodes: any[]) => {
    nodes.forEach((n) => {
      if (n.children.length === 0) {
        delete n.children;
      } else {
        clean(n.children);
      }
    });
  };
  clean(roots);
  return roots;
}

export default function ExportPage() {
  const navigate = useNavigate();
  const { currentSubjectId } = useSubjectStore();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [options, setOptions] = useState({
    originalImage: true,
    originalOcr: true,
    wrongSolutionImage: true,
    wrongSolutionOcr: true,
    referenceImage: true,
    referenceOcr: true,
    reason: true,
    tags: true,
    reviewCount: true,
    lastReviewAt: true,
    categoryPath: true,
  });
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [pageSizePickerVisible, setPageSizePickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [sortPickerVisible, setSortPickerVisible] = useState(false);
  const [orderPickerVisible, setOrderPickerVisible] = useState(false);
  const [printQuestions, setPrintQuestions] = useState<any[]>([]);
  const [printOptions, setPrintOptions] = useState<Record<string, boolean> | null>(null);
  const [pendingExport, setPendingExport] = useState(false);
  const [exportProgress, setExportProgress] = useState<ProgressInfo | null>(null);
  const [lastRecord, setLastRecord] = useState<PdfRecord | null>(null);
  const generatingRef = useRef(false);

  // filters
  const [categoryIdPath, setCategoryIdPath] = useState<string[]>([]);
  const [filterTagId, setFilterTagId] = useState<number | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [cascaderVisible, setCascaderVisible] = useState(false);
  const [tagPickerVisible, setTagPickerVisible] = useState(false);
  const [statusPickerVisible, setStatusPickerVisible] = useState(false);

  // load filters + questions when subject or filter changes
  useEffect(() => {
    if (currentSubjectId) {
      Promise.all([
        getCategories(currentSubjectId),
        getTags(currentSubjectId),
      ]).then(([catRes, tagRes]) => {
        setCategories(catRes.data);
        setTags(tagRes.data);
      }).catch(() => {});
    }
    loadQuestions();
  }, [currentSubjectId, categoryIdPath, filterTagId, filterStatus]);

  useEffect(() => {
    if (!pendingExport) return;
    if (generatingRef.current) return;
    if (printQuestions.length === 0 || !printOptions) return;

    generatingRef.current = true;

    (async () => {
      try {
        // Build structured print data from questions + options
        const include: Record<string, boolean> = {};
        for (const [k, v] of Object.entries(printOptions)) include[k] = v !== false;

        const printData: PrintQuestion[] = printQuestions.map((q: any, idx: number) => {
          const blocks: PrintBlock[] = [];

          blocks.push({ type: 'heading', text: q.name || `题目 ${idx + 1}` });

          // Info box: tags, review count, last review, category
          {
            const infoLines: string[] = [];
            if (include.tags && q.tags?.length > 0) infoLines.push(`标签: ${q.tags.join(', ')}`);
            if (include.reviewCount) infoLines.push(`复习次数: ${q.reviewCount}`);
            if (include.lastReviewAt) infoLines.push(`最后复盘: ${q.lastReviewAt}`);
            if (include.categoryPath && q.category_name) infoLines.push(`章节: ${q.category_name}`);
            if (infoLines.length > 0) {
              blocks.push({ type: 'text', text: infoLines.join('\n'), boxed: true });
            }
          }

          // Reason box
          if (include.reason && q.reason_text) {
            blocks.push({ type: 'text', text: `错题原因: ${q.reason_text}`, boxed: true });
          }

          const origImages = q.images?.filter((i: any) => i.image_type === 'original_question') || [];
          const wrongImages = q.images?.filter((i: any) => i.image_type === 'wrong_solution') || [];
          const refImages = q.images?.filter((i: any) => i.image_type === 'reference_answer') || [];

          for (const img of origImages) {
            if (include.originalImage) blocks.push({ type: 'image', imageUrl: img.image_url });
            if (include.originalOcr && img.ocr_text) {
              blocks.push({ type: 'text', text: img.ocr_text });
            }
          }
          for (const img of wrongImages) {
            if (include.wrongSolutionImage) blocks.push({ type: 'image', imageUrl: img.image_url });
            if (include.wrongSolutionOcr && img.ocr_text) {
              blocks.push({ type: 'text', text: img.ocr_text });
            }
          }
          for (const img of refImages) {
            if (include.referenceImage) blocks.push({ type: 'image', imageUrl: img.image_url });
            if (include.referenceOcr && img.ocr_text) {
              blocks.push({ type: 'text', text: img.ocr_text });
            }
          }

          return { blocks };
        });

        setExportProgress({ phase: 'images', current: 0, total: 0 });
        const record = await generateAndSavePdf(
          printData,
          `错题导出 (${selectedIds.length}题)`,
          selectedIds.length,
          pageSize,
          (info) => setExportProgress(info)
        );
        setPendingExport(false);
        setLastRecord(record);
        Toast.show({ content: 'PDF已保存到本地', icon: 'success' });
        navigate('/pdf-viewer', { state: { record } });
      } catch (err: any) {
        setPendingExport(false);
        console.error('PDF生成失败:', err);
        Toast.show({ content: 'PDF生成失败: ' + (err.message || ''), icon: 'fail' });
      } finally {
        setLoading(false);
        setPrintQuestions([]);
        setPrintOptions(null);
        setExportProgress(null);
        generatingRef.current = false;
      }
    })();
  }, [pendingExport, printQuestions, printOptions]);

  const loadQuestions = async () => {
    setListLoading(true);
    try {
      const params: any = { pageSize: 500 };
      if (currentSubjectId) params.subject_id = currentSubjectId;
      const filterCategoryId = categoryIdPath.length > 0 ? Number(categoryIdPath[categoryIdPath.length - 1]) : undefined;
      if (filterCategoryId) params.category_id = filterCategoryId;
      if (filterTagId) params.tag_id = filterTagId;
      if (filterStatus === 'summary') {
        // summary status now includes old "photo" status
        params.status = '';
      } else if (filterStatus) {
        params.status = filterStatus;
      }
      const res = await getQuestions(params);
      let list = res.data.list;
      if (filterStatus === 'summary') {
        list = list.filter((q: Question) => q.status === 'summary' || q.status === 'photo');
      }
      setQuestions(list);
    } finally {
      setListLoading(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    setSelectedIds((prev) => {
      const existing = new Set(prev);
      for (const q of questions) existing.add(q.id);
      return Array.from(existing);
    });
  };

  const clearSelection = () => setSelectedIds([]);

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
      setPendingExport(true);
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

  const pageSizeOptions = [
    { label: 'A4 (210×297mm)', value: 'a4' },
    { label: 'A5 (148×210mm)', value: 'a5' },
    { label: 'B4 (250×353mm)', value: 'b4' },
    { label: 'B5 (176×250mm)', value: 'b5' },
  ];

  const sortFieldLabel = sortFieldOptions.find((o) => o.value === sortField)?.label || '创建时间';
  const sortOrderLabel = sortOrderOptions.find((o) => o.value === sortOrder)?.label || '降序';
  const pageSizeLabel = pageSizeOptions.find((o) => o.value === pageSize)?.label || 'A4';

  const cascaderOptions = buildCascaderOptions(categories);

  const tagOptions = [
    { label: '全部标签', value: 0 },
    ...tags.map((t) => ({ label: t.name, value: t.id })),
  ];

  const catLabel = categoryIdPath.length > 0
    ? categoryIdPath.map((id) => categories.find((c) => String(c.id) === id)?.name).filter(Boolean).join(' / ')
    : '全部章节';
  const tagLabel = tagOptions.find((o) => o.value === (filterTagId || 0))?.label || '全部标签';
  const statusLabel = statusOptions.find((o) => o.value === (filterStatus || ''))?.label || '全部状态';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NavBar onBack={() => navigate(-1)}>导出 PDF</NavBar>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: 12 }}>

        {/* ── 筛选条件 ── */}
        <List header="筛选条件">
          <List.Item
            extra={catLabel}
            onClick={() => setCascaderVisible(true)}
            arrow
          >
            章节
          </List.Item>
          <List.Item
            extra={tagLabel}
            onClick={() => setTagPickerVisible(true)}
            arrow
          >
            标签
          </List.Item>
          <List.Item
            extra={statusLabel}
            onClick={() => setStatusPickerVisible(true)}
            arrow
          >
            状态
          </List.Item>
        </List>

        <Cascader
          options={cascaderOptions}
          visible={cascaderVisible}
          onClose={() => setCascaderVisible(false)}
          value={categoryIdPath}
          onConfirm={(v) => setCategoryIdPath(v as string[])}
        />
        <Picker
          columns={[tagOptions]}
          visible={tagPickerVisible}
          onClose={() => setTagPickerVisible(false)}
          value={[filterTagId || 0]}
          onConfirm={(v) => {
            const val = v[0] as number;
            setFilterTagId(val || undefined);
            setTagPickerVisible(false);
          }}
          title="选择标签"
        />
        <Picker
          columns={[statusOptions]}
          visible={statusPickerVisible}
          onClose={() => setStatusPickerVisible(false)}
          value={[filterStatus || '']}
          onConfirm={(v) => {
            const val = v[0] as string;
            setFilterStatus(val || undefined);
            setStatusPickerVisible(false);
          }}
          title="选择状态"
        />

        {/* ── 题目列表 ── */}
        <List
          header={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>题目 ({questions.length})</span>
              <span style={{ fontSize: 13, color: '#1677ff', fontWeight: 500 }}>
                已选 {selectedIds.length} 题
              </span>
            </div>
          }
          style={{ marginTop: 12 }}
        >
          <List.Item
            style={{ background: '#f5f7fa' }}
            prefix={
              <Checkbox
                checked={questions.length > 0 && questions.every((q) => selectedIds.includes(q.id))}
                indeterminate={
                  questions.some((q) => selectedIds.includes(q.id)) &&
                  !questions.every((q) => selectedIds.includes(q.id))
                }
              />
            }
            onClick={selectAllFiltered}
            extra={
              <span style={{ fontSize: 12, color: '#1677ff' }}>{questions.length} 题</span>
            }
          >
            全选筛选结果
          </List.Item>
          {selectedIds.length > 0 && (
            <List.Item
              style={{ background: '#f5f7fa' }}
              onClick={clearSelection}
            >
              <span style={{ fontSize: 13, color: '#ff4d4f' }}>清除已选 ({selectedIds.length} 题)</span>
            </List.Item>
          )}

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
              extra={
                <span style={{ fontSize: 12, color: '#999', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {q.category_name}
                </span>
              }
            >
              <div>
                <span style={{ fontSize: 14 }}>{q.name || `题目 #${q.id}`}</span>
                {q.tags && q.tags.length > 0 && (
                  <span style={{ marginLeft: 6, fontSize: 11, color: '#1677ff', background: '#e6f4ff', padding: '2px 6px', borderRadius: 4 }}>
                    {q.tags.map((t: any) => typeof t === 'string' ? t : t.name).slice(0, 2).join(' ')}{q.tags.length > 2 ? '...' : ''}
                  </span>
                )}
                {q.review_count > 0 && (
                  <span style={{ marginLeft: 4, fontSize: 11, color: '#fa8c16' }}>
                    复习{q.review_count}次
                  </span>
                )}
              </div>
            </List.Item>
          ))}

          {!listLoading && questions.length === 0 && (
            <List.Item>
              <span style={{ color: '#999' }}>暂无题目</span>
            </List.Item>
          )}
        </List>

        {listLoading && (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <SpinLoading color="primary" />
          </div>
        )}

        {/* ── 包含内容 ── */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#333', padding: '8px 0', margin: '0 12px' }}>包含内容</div>
          {optionGroups.map((group) => (
            <div key={group.title} style={{ margin: '0 12px 12px', background: '#fff', borderRadius: 8, padding: 10, border: '1px solid #eee' }}>
              <div style={{ fontSize: 13, color: '#999', marginBottom: 6, fontWeight: 500 }}>{group.title}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                {group.keys.map((key) => (
                  <div
                    key={key}
                    onClick={() => setOptions((prev) => ({ ...prev, [key]: !((prev as any)[key]) }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', cursor: 'pointer' }}
                  >
                    <Checkbox
                      checked={(options as any)[key]}
                      onChange={(checked) => setOptions((prev) => ({ ...prev, [key]: checked }))}
                    />
                    <span style={{ fontSize: 13, color: '#333' }}>{optionLabels[key]}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── 排序 ── */}
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

        {/* ── 页面尺寸 ── */}
        <List header="页面尺寸" style={{ marginTop: 12 }}>
          <List.Item
            extra={pageSizeLabel}
            onClick={() => setPageSizePickerVisible(true)}
            arrow
          >
            纸张大小
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
        <Picker
          columns={[pageSizeOptions]}
          visible={pageSizePickerVisible}
          onClose={() => setPageSizePickerVisible(false)}
          value={[pageSize]}
          onConfirm={(v) => { setPageSize(v[0] as PageSize); setPageSizePickerVisible(false); }}
          title="页面尺寸"
        />
      </div>

      <div style={{ padding: 12, borderTop: '1px solid #eee' }}>
        {exportProgress && (
          <div style={{ marginBottom: 10, background: '#f0f5ff', borderRadius: 8, padding: 10, border: '1px solid #d6e4ff' }}>
            <div style={{ fontSize: 13, color: '#1677ff', fontWeight: 500, marginBottom: 6 }}>
              {exportProgress.phase === 'images'
                ? exportProgress.total === 0
                  ? '正在准备图片...'
                  : `正在下载图片 (${exportProgress.current}/${exportProgress.total})`
                : `正在生成页面 (${exportProgress.current}/${exportProgress.total})`}
            </div>
            <div style={{ height: 4, background: '#e8e8e8', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                background: '#1677ff',
                borderRadius: 2,
                transition: 'width 0.2s',
                width: exportProgress.total === 0 && exportProgress.phase === 'images'
                  ? '50%'
                  : `${Math.round(exportProgress.current / Math.max(exportProgress.total, 1) * 100)}%`,
              }} />
            </div>
          </div>
        )}
        <Button block color="primary" size="large" loading={loading} onClick={handleExport}>
          {loading ? '生成中...' : `导出 PDF (${selectedIds.length} 题)`}
        </Button>
      </div>
    </div>
  );
}
