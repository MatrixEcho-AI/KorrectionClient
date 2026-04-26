import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuestions, deleteQuestion, type Question } from '@/api/questions';
import { useCategoryStore } from '@/stores/categoryStore';
import { useSubjectStore } from '@/stores/subjectStore';
import {
  NavBar,
  Tabs,
  List,
  Button,
  Empty,
  Tag,
  SwipeAction,
  Dialog,
  Toast,
  SpinLoading,
  Image,
  Picker,
} from 'antd-mobile';
import { AddOutline, DeleteOutline, DownOutline } from 'antd-mobile-icons';

const statusMap: Record<string, string> = {
  photo: '总结',
  summary: '复盘',
  review: '复盘',
  redo: '重做',
  completed: '完成',
};

const statusColors: Record<string, string> = {
  photo: '#999',
  summary: '#ff8f1f',
  review: '#ff8f1f',
  redo: '#873bf4',
  completed: '#00b578',
};

export default function Home() {
  const navigate = useNavigate();
  const { fetch: fetchCategories } = useCategoryStore();
  const { subjects, currentSubjectId, fetch: fetchSubjects, setCurrent, init: initSubject } = useSubjectStore();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pickerVisible, setPickerVisible] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    initSubject().then(() => {
      fetchSubjects();
    });
  }, []);

  useEffect(() => {
    fetchCategories(currentSubjectId || undefined);
  }, [currentSubjectId]);

  useEffect(() => {
    loadQuestions(1);
  }, [statusFilter, currentSubjectId]);

  const loadQuestions = async (p: number) => {
    setLoading(true);
    try {
      const res = await getQuestions({
        subject_id: currentSubjectId || undefined,
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

  const currentSubject = subjects.find((s) => s.id === currentSubjectId);
  const pickerColumns = [subjects.map((s) => ({ label: s.name, value: s.id }))];

  const handleDelete = async (id: number) => {
    const result = await Dialog.confirm({ content: '确定删除这道题？' });
    if (result) {
      await deleteQuestion(id);
      Toast.show({ content: '已删除', icon: 'success' });
      loadQuestions(1);
    }
  };

  const rightActions = (id: number) => [
    {
      key: 'delete',
      text: <DeleteOutline />,
      color: 'danger',
      onClick: () => handleDelete(id),
    },
  ];

  const tabItems = [
    { key: '', title: '全部' },
    { key: 'photo', title: '总结' },
    { key: 'summary,review', title: '复盘' },
    { key: 'redo', title: '重做' },
    { key: 'completed', title: '完成' },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NavBar
        back={null}
        left={
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}
            onClick={() => setPickerVisible(true)}
          >
            <span>{currentSubject ? currentSubject.name : '选择科目'}</span>
            <DownOutline />
          </div>
        }
        right={
          <div style={{ display: 'flex', gap: 12, fontSize: 14 }}>
            <span style={{ color: '#1677ff' }} onClick={() => navigate('/subjects')}>科目</span>
            <span style={{ color: '#1677ff' }} onClick={() => navigate('/export')}>导出</span>
            <span style={{ color: '#1677ff' }} onClick={() => navigate('/categories')}>章节</span>
            <span style={{ color: '#666' }} onClick={() => navigate('/trash')}>回收站</span>
            <span style={{ color: '#666' }} onClick={() => navigate('/settings')}>设置</span>
          </div>
        }
      />

      <Tabs activeKey={statusFilter} onChange={(k) => setStatusFilter(k)}>
        {tabItems.map((item) => (
          <Tabs.Tab title={item.title} key={item.key} />
        ))}
      </Tabs>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {!currentSubject && !loading && (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <Empty description="请先选择或添加科目" />
            <Button color="primary" size="small" onClick={() => navigate('/subjects')} style={{ marginTop: 16 }}>
              去添加科目
            </Button>
          </div>
        )}
        {currentSubject && questions.length === 0 && !loading && (
          <Empty description="暂无错题" />
        )}

        <List>
          {questions.map((q) => (
            <SwipeAction key={q.id} rightActions={rightActions(q.id)}>
              <List.Item
                onClick={() => navigate(`/questions/${q.id}`)}
                prefix={
                  q.images && q.images.length > 0 ? (
                    <Image
                      src={q.images[0].image_url}
                      style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }}
                      fit="cover"
                    />
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: 8, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 12 }}>无图</div>
                  )
                }
                description={
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                    <Tag color={statusColors[q.status]} fill="outline" style={{ fontSize: 11 }}>
                      {statusMap[q.status]}
                    </Tag>
                    <span style={{ fontSize: 12, color: '#999' }}>{q.category_name || '-'} · 复习{q.review_count}次</span>
                  </div>
                }
              >
                <div style={{ fontSize: 14 }}>题目 #{q.id}</div>
              </List.Item>
            </SwipeAction>
          ))}
        </List>

        {questions.length > 0 && questions.length < total && !loading && (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <Button onClick={() => loadQuestions(page + 1)}>加载更多</Button>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <SpinLoading color="primary" />
          </div>
        )}
      </div>

      <div style={{ padding: 12, borderTop: '1px solid #eee' }}>
        <Button block color="primary" size="large" onClick={() => navigate('/questions/new')}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <AddOutline /> 拍照录入
          </span>
        </Button>
      </div>

      <Picker
        columns={pickerColumns}
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onConfirm={(val) => {
          const id = val[0] as number;
          if (id) setCurrent(id);
          setPickerVisible(false);
        }}
        title="选择科目"
      />
    </div>
  );
}
