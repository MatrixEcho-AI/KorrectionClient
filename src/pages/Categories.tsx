import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories, createCategory, updateCategory, deleteCategory, type Category } from '@/api/categories';

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
    <div className="ml-2">
      <div className="flex items-center gap-2 py-2">
        {hasChildren ? (
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-gray-400">
            {expanded ? '▼' : '▶'}
          </button>
        ) : (
          <span className="w-3" />
        )}
        <span className="flex-1 text-sm">{node.name}</span>
        <button onClick={() => onAdd(node.id)} className="text-xs text-primary">
          +子
        </button>
        <button onClick={() => onEdit(node.id, node.name)} className="text-xs text-secondary">
          编辑
        </button>
        <button onClick={() => onDelete(node.id)} className="text-xs text-danger">
          删除
        </button>
      </div>
      {expanded && hasChildren && (
        <div className="border-l pl-2">
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [addingParentId, setAddingParentId] = useState<number | null>(null);
  const [addingName, setAddingName] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getCategories();
      setCategories(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!addingName.trim()) return;
    try {
      await createCategory({ parent_id: addingParentId || 0, name: addingName.trim() });
      setAddingName('');
      setAddingParentId(null);
      await load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEdit = async () => {
    if (!editingName.trim() || editingId == null) return;
    try {
      await updateCategory(editingId, { name: editingName.trim() });
      setEditingId(null);
      setEditingName('');
      await load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除？')) return;
    try {
      await deleteCategory(id);
      await load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const tree = buildTree(categories);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center border-b px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-gray-500">
          ←
        </button>
        <h1 className="mx-auto text-lg font-bold">章节管理</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex gap-2">
          <input
            value={addingName}
            onChange={(e) => setAddingName(e.target.value)}
            placeholder="新建科目/章节"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button onClick={handleAdd} className="rounded-lg bg-primary px-4 py-2 text-sm text-white">
            创建
          </button>
        </div>

        {editingId !== null && (
          <div className="mb-4 flex gap-2 rounded-lg bg-yellow-50 p-3">
            <input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
            />
            <button onClick={handleEdit} className="text-sm text-primary">
              保存
            </button>
            <button onClick={() => setEditingId(null)} className="text-sm text-gray-500">
              取消
            </button>
          </div>
        )}

        {loading && <div className="text-center text-sm text-gray-400">加载中...</div>}

        <div>
          {tree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              onAdd={(pid) => {
                setAddingParentId(pid);
                setAddingName('');
              }}
              onEdit={(id, name) => {
                setEditingId(id);
                setEditingName(name);
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
