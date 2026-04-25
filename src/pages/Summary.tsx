import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuestion, submitSummary, getRecommendations } from '@/api/questions';
import { getTags, createTag, type Tag } from '@/api/tags';
import { useCategoryStore } from '@/stores/categoryStore';

export default function Summary() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { categories } = useCategoryStore();
  const [reason, setReason] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    try {
      const res = await getQuestion(Number(id));
      setReason(res.data.reason_text || '');
      setCategoryId(res.data.category_id);

      // 找到科目 ID（当前节点的根）
      let currId = res.data.category_id;
      let curr = categories.find((c) => c.id === currId);
      while (curr && curr.parent_id !== 0) {
        currId = curr.parent_id;
        curr = categories.find((c) => c.id === currId);
      }
      const sid = curr?.id || res.data.category_id;
      setSubjectId(sid);

      if (sid) {
        const tRes = await getTags(sid);
        setTags(tRes.data);
      }

      if (res.data.tags) {
        setSelectedTagIds(res.data.tags.map((t: any) => t.id));
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim() || !subjectId) return;
    try {
      const res = await createTag({ subject_id: subjectId, name: newTagName.trim() });
      const newTag: Tag = { id: res.data.id, user_id: 0, subject_id: subjectId, name: newTagName.trim() };
      setTags((prev) => [...prev, newTag]);
      setSelectedTagIds((prev) => [...prev, newTag.id]);
      setNewTagName('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRecommend = async () => {
    setRecommendLoading(true);
    setError('');
    try {
      const res = await getRecommendations(Number(id));
      const { category_id, tag_ids } = res.data;
      if (category_id) setCategoryId(category_id);
      if (tag_ids.length) {
        setSelectedTagIds((prev) => Array.from(new Set([...prev, ...tag_ids])));
      }
    } catch (err: any) {
      setError('AI 推荐失败: ' + err.message);
    } finally {
      setRecommendLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('请填写错题原因');
      return;
    }
    if (selectedTagIds.length === 0) {
      setError('请至少选择一个标签');
      return;
    }
    setLoading(true);
    try {
      await submitSummary(Number(id), {
        reason_text: reason.trim(),
        category_id: categoryId ? Number(categoryId) : undefined,
        tag_ids: selectedTagIds,
      });
      navigate(`/questions/${id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center border-b px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-gray-500">
          ←
        </button>
        <h1 className="mx-auto text-lg font-bold">总结错题</h1>
        <button
          onClick={handleRecommend}
          disabled={recommendLoading}
          className="text-xs text-primary disabled:text-gray-400"
        >
          {recommendLoading ? '推荐中...' : 'AI推荐'}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {error && <p className="mb-3 text-sm text-danger">{error}</p>}

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">错题原因</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="为什么做错了？思路问题？知识点不熟？"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">归属章节</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">请选择</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {'　'.repeat(c.level - 1) + c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">标签</label>
          <div className="mb-2 flex flex-wrap gap-2">
            {tags.map((t) => (
              <button
                key={t.id}
                onClick={() => toggleTag(t.id)}
                className={`rounded-full px-3 py-1 text-xs ${
                  selectedTagIds.includes(t.id)
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="新建标签"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              onClick={handleCreateTag}
              disabled={!newTagName.trim()}
              className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-primary disabled:text-gray-400"
            >
              添加
            </button>
          </div>
        </div>
      </div>

      <div className="border-t p-4">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-lg bg-primary py-3 font-medium text-white disabled:opacity-60"
        >
          {loading ? '保存中...' : '完成总结'}
        </button>
      </div>
    </div>
  );
}
