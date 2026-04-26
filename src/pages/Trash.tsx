import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuestions, restoreQuestion, permanentDeleteQuestion, type Question } from '@/api/questions';
import { useSubjectStore } from '@/stores/subjectStore';
import { NavBar, List, Button, Dialog, Toast, Empty, SpinLoading } from 'antd-mobile';
import { UndoOutline, DeleteOutline } from 'antd-mobile-icons';

export default function Trash() {
  const navigate = useNavigate();
  const { currentSubjectId } = useSubjectStore();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, [currentSubjectId]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getQuestions({ status: 'deleted', subject_id: currentSubjectId || undefined, pageSize: 500 });
      setQuestions(res.data.list);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: number) => {
    await restoreQuestion(id);
    Toast.show({ content: '已恢复', icon: 'success' });
    await load();
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
    setDeleteVisible(true);
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    await permanentDeleteQuestion(deleteId);
    Toast.show({ content: '已删除', icon: 'success' });
    setDeleteVisible(false);
    setDeleteId(null);
    await load();
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NavBar onBack={() => navigate(-1)}>回收站</NavBar>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: 12 }}>
        {questions.length === 0 && !loading && (
          <Empty description="回收站为空" />
        )}

        <List>
          {questions.map((q) => (
            <List.Item
              key={q.id}
              description={
                <span style={{ fontSize: 12, color: '#999' }}>
                  {new Date(q.created_at).toLocaleDateString()}
                </span>
              }
              extra={
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button size="mini" color="primary" fill="outline" onClick={() => handleRestore(q.id)}>
                    <UndoOutline />
                  </Button>
                  <Button size="mini" color="danger" fill="outline" onClick={() => handleDelete(q.id)}>
                    <DeleteOutline />
                  </Button>
                </div>
              }
            >
              <span style={{ fontSize: 14 }}>{q.name || `题目 #${q.id}`}</span>
            </List.Item>
          ))}
        </List>

        {loading && (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <SpinLoading color="primary" />
          </div>
        )}
      </div>

      <Dialog
        visible={deleteVisible}
        content="彻底删除后无法恢复，确定吗？"
        closeOnAction
        onClose={() => { setDeleteVisible(false); setDeleteId(null); }}
        actions={[
          { key: 'cancel', text: '取消', onClick: () => { setDeleteVisible(false); setDeleteId(null); } },
          { key: 'confirm', text: '确定', danger: true, bold: true, onClick: confirmDelete },
        ]}
      />
    </div>
  );
}
