import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuestion, submitSummary, getRecommendations } from '@/api/questions';
import { getTags, createTag, type Tag } from '@/api/tags';
import { useCategoryStore } from '@/stores/categoryStore';
import { useSubjectStore } from '@/stores/subjectStore';
import { NavBar, Button, TextArea, Tag as AmTag, Toast, Picker, Input } from 'antd-mobile';

export default function Summary() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { categories, fetch: fetchCategories } = useCategoryStore();
  const { currentSubjectId } = useSubjectStore();
  const [reason, setReason] = useState('');
  const [categoryId, setCategoryId] = useState<number[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

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
        setCategoryId([res.data.category_id]);
      }
      if (res.data.tags) {
        setSelectedTagIds(res.data.tags.map((t: any) => t.id));
      }
      // 加载当前科目的标签
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
      if (category_id) setCategoryId([category_id]);
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
      await submitSummary(Number(id), {
        reason_text: reason.trim(),
        category_id: categoryId[0] || undefined,
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

  const categoryColumns = [categories.map((c) => ({ label: '　'.repeat(c.level - 1) + c.name, value: c.id }))];
  const selectedCategoryName = categories.find((c) => c.id === categoryId[0])?.name || '请选择章节';

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

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
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
          <Button block fill="outline" onClick={() => setCategoryPickerVisible(true)}>
            {selectedCategoryName}
          </Button>
          <Picker
            columns={categoryColumns}
            visible={categoryPickerVisible}
            onClose={() => setCategoryPickerVisible(false)}
            value={categoryId}
            onConfirm={(v) => { setCategoryId(v as number[]); setCategoryPickerVisible(false); }}
            title="选择章节"
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
