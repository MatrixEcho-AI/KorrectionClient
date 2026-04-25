import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories, createCategory, updateCategory, deleteCategory, type Category } from '@/api/categories';
import { useSubjectStore } from '@/stores/subjectStore';
import { NavBar, List, Button, Input, Dialog, Toast, SwipeAction, Space, Modal, Empty } from 'antd-mobile';
import { AddOutline, EditSOutline, DeleteOutline, DownOutline, RightOutline } from 'antd-mobile-icons';

function buildTree(list: Category[]): (Category & { children?: Category[] })[] {
  const map = new Map<number, Category & { children?: Category[] }>();
  list.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: (Category & { children?: Category[] })[] = [];
  list.forEach((c) => {
    if (c.parent_id === 0) {
      roots.push(map.get(c.id)!);
    } else {
      const parent = map.get(c.parent_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(map.get(c.id)!);
      }
    }
  });
  return roots;
}

function TreeNode({
  node,
  onAdd,
  onEdit,
  onDelete,
}: {
  node: Category & { children?: Category[] };
  onAdd: (parentId: number) => void;
  onEdit: (id: number, name: string) => void;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div style={{ marginLeft: 16 }}>
      <SwipeAction
        rightActions={[
          { key: 'edit', text: <EditSOutline />, color: 'primary', onClick: () => onEdit(node.id, node.name) },
          { key: 'delete', text: <DeleteOutline />, color: 'danger', onClick: () => onDelete(node.id) },
        ]}
      >
        <List.Item
          prefix={
            <Space>
              {hasChildren && (
                <span style={{ color: '#999', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
                  {expanded ? <DownOutline /> : <RightOutline />}
                </span>
              )}
              <span style={{ fontSize: 14 }}>{node.name}</span>
            </Space>
          }
          extra={
            <Button size="mini" fill="outline" onClick={() => onAdd(node.id)}>
              <AddOutline />
            </Button>
          }
        />
      </SwipeAction>
      {expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Categories() {
  const navigate = useNavigate();
  const { currentSubjectId } = useSubjectStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingName, setAddingName] = useState('');
  const [addingParentId, setAddingParentId] = useState<number | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    load();
  }, [currentSubjectId]);

  const load = async () => {
    if (!currentSubjectId) {
      setCategories([]);
      return;
    }
    setLoading(true);
    try {
      const res = await getCategories(currentSubjectId);
      setCategories(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!addingName.trim()) return;
    try {
      await createCategory({ parent_id: addingParentId || 0, subject_id: addingParentId ? undefined : currentSubjectId || undefined, name: addingName.trim() });
      setAddingName('');
      setAddingParentId(null);
      await load();
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
      await updateCategory(editId, { name: editName.trim() });
      setEditVisible(false);
      setEditId(null);
      setEditName('');
      await load();
      Toast.show({ content: '修改成功', icon: 'success' });
    } catch (err: any) {
      Toast.show({ content: err.message, icon: 'fail' });
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Dialog.confirm({ content: '确定删除？子节点和题目会受影响。' });
    if (!result) return;
    try {
      await deleteCategory(id);
      await load();
      Toast.show({ content: '删除成功', icon: 'success' });
    } catch (err: any) {
      Toast.show({ content: err.message, icon: 'fail' });
    }
  };

  const tree = buildTree(categories);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NavBar onBack={() => navigate(-1)}>章节管理</NavBar>

      <div style={{ padding: 12, borderBottom: '1px solid #eee' }}>
        <Space block>
          <Input
            placeholder="新建科目/章节"
            value={addingName}
            onChange={(v) => setAddingName(v)}
            style={{ flex: 1 }}
          />
          <Button color="primary" onClick={handleAdd}>
            <AddOutline /> 创建
          </Button>
        </Space>
        {addingParentId !== null && (
          <div style={{ fontSize: 12, color: '#1677ff', marginTop: 4 }}>
            将作为 ID:{addingParentId} 的子节点创建
            <span style={{ color: '#999', marginLeft: 8 }} onClick={() => setAddingParentId(null)}>取消</span>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <List>
          {tree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              onAdd={(pid) => { setAddingParentId(pid); setAddingName(''); }}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </List>
        {!currentSubjectId && !loading && (
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <Empty description="请先选择科目" />
            <Button color="primary" size="small" onClick={() => navigate('/')} style={{ marginTop: 12 }}>
              去选择科目
            </Button>
          </div>
        )}
        {currentSubjectId && categories.length === 0 && !loading && <Empty description="暂无章节" />}
      </div>

      <Modal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        title="重命名"
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
