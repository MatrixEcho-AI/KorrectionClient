import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSubjects, createSubject, updateSubject, deleteSubject, type Subject } from '@/api/subjects';
import { useSubjectStore } from '@/stores/subjectStore';
import { NavBar, List, Button, Input, Dialog, Toast, SwipeAction, Space, Modal, Empty } from 'antd-mobile';
import { AddOutline, EditSOutline, DeleteOutline } from 'antd-mobile-icons';

export default function Subjects() {
  const navigate = useNavigate();
  const { fetch: fetchSubjects, setCurrent, currentSubjectId } = useSubjectStore();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingName, setAddingName] = useState('');
  const [editVisible, setEditVisible] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getSubjects();
      setSubjects(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!addingName.trim()) return;
    try {
      await createSubject({ name: addingName.trim() });
      setAddingName('');
      await load();
      await fetchSubjects();
      Toast.show({ content: '创建成功', icon: 'success' });
    } catch (err: any) {
      Toast.show({ content: err.message, icon: 'fail' });
    }
  };

  const openEdit = (id: number, name: string) => {
    setEditId(id);
    setEditName(name);
    setEditVisible(true);
  };

  const handleEditSave = async () => {
    if (!editName.trim() || editId === null) return;
    try {
      await updateSubject(editId, { name: editName.trim() });
      setEditVisible(false);
      setEditId(null);
      setEditName('');
      await load();
      await fetchSubjects();
      Toast.show({ content: '修改成功', icon: 'success' });
    } catch (err: any) {
      Toast.show({ content: err.message, icon: 'fail' });
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Dialog.confirm({ content: '确定删除该科目？关联的章节和题目将受影响。' });
    if (!result) return;
    try {
      await deleteSubject(id);
      if (currentSubjectId === id) {
        await setCurrent(null);
      }
      await load();
      await fetchSubjects();
      Toast.show({ content: '删除成功', icon: 'success' });
    } catch (err: any) {
      Toast.show({ content: err.message, icon: 'fail' });
    }
  };

  const handleSelect = async (id: number) => {
    await setCurrent(id);
    Toast.show({ content: '已切换科目', icon: 'success' });
    navigate('/');
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NavBar onBack={() => navigate(-1)}>科目管理</NavBar>

      <div style={{ padding: 12, borderBottom: '1px solid #eee' }}>
        <Space block>
          <Input
            placeholder="新建科目（如：数学）"
            value={addingName}
            onChange={(v) => setAddingName(v)}
            style={{ flex: 1 }}
          />
          <Button color="primary" onClick={handleAdd}>
            <AddOutline /> 创建
          </Button>
        </Space>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <List>
          {subjects.map((s) => (
            <SwipeAction
              key={s.id}
              rightActions={[
                { key: 'edit', text: <EditSOutline />, color: 'primary', onClick: () => openEdit(s.id, s.name) },
                { key: 'delete', text: <DeleteOutline />, color: 'danger', onClick: () => handleDelete(s.id) },
              ]}
            >
              <List.Item
                onClick={() => handleSelect(s.id)}
                extra={currentSubjectId === s.id ? <span style={{ color: '#1677ff' }}>当前</span> : null}
              >
                {s.name}
              </List.Item>
            </SwipeAction>
          ))}
        </List>
        {subjects.length === 0 && !loading && <Empty description="暂无科目" />}
      </div>

      <Modal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        title="重命名科目"
        content={
          <Input
            placeholder="新名称"
            value={editName}
            onChange={(v) => setEditName(v)}
          />
        }
        actions={[
          { key: 'cancel', text: '取消', onClick: () => setEditVisible(false) },
          { key: 'confirm', text: '保存', primary: true, onClick: handleEditSave },
        ]}
      />
    </div>
  );
}
