import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuestion, submitSummary, getRecommendations } from '@/api/questions';
import { getTags, createTag, type Tag } from '@/api/tags';
import { useCategoryStore } from '@/stores/categoryStore';
import { useSubjectStore } from '@/stores/subjectStore';
import { NavBar, Button, TextArea, Tag as AmTag, Toast, Cascader, Input } from 'antd-mobile';

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

function findCategoryPath(categories: { id: number; parent_id: number }[], targetId: number): string[] {
  const map = new Map<number, { id: number; parent_id: number }>();
  categories.forEach((c) => map.set(c.id, c));
  const path: number[] = [];
  let current = targetId;
  while (current) {
    path.unshift(current);
    const node = map.get(current);
    if (!node || node.parent_id === 0) break;
    current = node.parent_id;
  }
  return path.map(String);
}

export default function Summary() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { categories, fetch: fetchCategories } = useCategoryStore();
  const { currentSubjectId } = useSubjectStore();
  const [reason, setReason] = useState('');
  const [categoryIdPath, setCategoryIdPath] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [cascaderVisible, setCascaderVisible] = useState(false);

  useEffect(() => {
    if (currentSubjectId) {
      fetchCategories(currentSubjectId);
    }
    load();
  }, [id, currentSubjectId]);

  const load = async () => {
    try {
      const res = await getQuestion(Number(id));
      setReason(res.data.reason_text || '');
      if (res.data.category_id) {
        setCategoryIdPath(findCategoryPath(categories, res.data.category_id));
      }
      if (res.data.tags) {
        setSelectedTagIds(res.data.tags.map((t: any) => t.id));
      }
      if (res.data.subject_id) {
        const tRes = await getTags(res.data.subject_id);
        setTags(tRes.data);
      }
    } catch (err: any) {
      Toast.show({ content: err.message, icon: 'fail' });
    }
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim() || !currentSubjectId) return;
    try {
      const res = await createTag({ subject_id: currentSubjectId, name: newTagName.trim() });
      const newTag: Tag = { id: res.data.id, user_id: 0, subject_id: currentSubjectId, name: newTagName.trim() };
      setTags((prev) => [...prev, newTag]);
      setSelectedTagIds((prev) => [...prev, newTag.id]);
      setNewTagName('');
    } catch (err: any) {
      Toast.show({ content: err.message, icon: 'fail' });
    }
  };

  const handleRecommend = async () => {
    setRecommendLoading(true);
    try {
      const res = await getRecommendations(Number(id));
      const { category_id, tag_ids } = res.data;
      if (category_id) setCategoryIdPath(findCategoryPath(categories, category_id));
      if (tag_ids.length) {
        setSelectedTagIds((prev) => Array.from(new Set([...prev, ...tag_ids])));
      }
      Toast.show({ content: 'AI 推荐已应用', icon: 'success' });
    } catch (err: any) {
      Toast.show({ content: 'AI 推荐失败: ' + err.message, icon: 'fail' });
    } finally {
      setRecommendLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Toast.show({ content: '请填写错题原因', icon: 'fail' });
      return;
    }
    if (selectedTagIds.length === 0) {
      Toast.show({ content: '请至少选择一个标签', icon: 'fail' });
      return;
    }
    setLoading(true);
    try {
      const selectedCategoryId = categoryIdPath.length > 0 ? Number(categoryIdPath[categoryIdPath.length - 1]) : undefined;
      await submitSummary(Number(id), {
        reason_text: reason.trim(),
        category_id: selectedCategoryId,
        tag_ids: selectedTagIds,
      });
      Toast.show({ content: '保存成功', icon: 'success' });
      navigate(`/questions/${id}`);
    } catch (err: any) {
      Toast.show({ content: err.message, icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  const cascaderOptions = buildCascaderOptions(categories);
  const selectedCategoryName = categoryIdPath.length > 0
    ? categoryIdPath.map((id) => categories.find((c) => String(c.id) === id)?.name).filter(Boolean).join(' / ')
    : '请选择章节';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NavBar
        onBack={() => navigate(-1)}
        right={
          <Button size="mini" color="primary" fill="outline" loading={recommendLoading} onClick={handleRecommend}>
            AI推荐
          </Button>
        }
      >
        总结错题
      </NavBar>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>错题原因</div>
          <TextArea
            placeholder="为什么做错了？思路问题？知识点不熟？"
            rows={4}
            value={reason}
            onChange={(v) => setReason(v)}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>归属章节</div>
          <Button block fill="outline" onClick={() => setCascaderVisible(true)} style={{ marginBottom: 16 }}>
            {selectedCategoryName}
          </Button>
          <Cascader
            options={cascaderOptions}
            visible={cascaderVisible}
            onClose={() => setCascaderVisible(false)}
            value={categoryIdPath}
            onConfirm={(v) => setCategoryIdPath(v as string[])}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>标签</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {tags.map((t) => (
              <AmTag
                key={t.id}
                color={selectedTagIds.includes(t.id) ? 'primary' : 'default'}
                onClick={() => toggleTag(t.id)}
              >
                {t.name}
              </AmTag>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              placeholder="新建标签"
              value={newTagName}
              onChange={(v) => setNewTagName(v)}
              style={{ flex: 1 }}
            />
            <Button color="primary" disabled={!newTagName.trim()} onClick={handleCreateTag}>
              添加
            </Button>
          </div>
        </div>
      </div>

      <div style={{ padding: 12, borderTop: '1px solid #eee' }}>
        <Button block color="primary" size="large" loading={loading} onClick={handleSubmit}>
          {loading ? '保存中...' : '完成总结'}
        </Button>
      </div>
    </div>
  );
}
