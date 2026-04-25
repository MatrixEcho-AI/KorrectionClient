import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { createQuestion, addImage, triggerOcr } from '@/api/questions';
import { getStsToken } from '@/api/oss';
import { useCategoryStore } from '@/stores/categoryStore';
import { useSubjectStore } from '@/stores/subjectStore';
import { compressImage, uploadToOss } from '@/utils/image';
import { NavBar, Button, Cascader, Toast, Image, Space, Card, Empty } from 'antd-mobile';

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

export default function QuestionNew() {
  const navigate = useNavigate();
  const { categories, fetch: fetchCategories } = useCategoryStore();
  const { currentSubjectId } = useSubjectStore();
  const [categoryIdPath, setCategoryIdPath] = useState<string[]>([]);
  const [images, setImages] = useState<{ url: string; type: string; local: string }[]>([]);
  const [cascaderVisible, setCascaderVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const questionIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (currentSubjectId) {
      fetchCategories(currentSubjectId);
    }
  }, [currentSubjectId]);

  const cascaderOptions = buildCascaderOptions(categories);
  const selectedCategoryId = categoryIdPath.length > 0 ? Number(categoryIdPath[categoryIdPath.length - 1]) : undefined;

  const selectedCategoryName = categoryIdPath.length > 0
    ? categoryIdPath.map((id) => categories.find((c) => String(c.id) === id)?.name).filter(Boolean).join(' / ')
    : '请选择章节';

  const takePhoto = async (type: string) => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
      });
      if (!photo.webPath) return;

      const blob = await fetch(photo.webPath).then((r) => r.blob());
      const compressed = await compressImage(new File([blob], 'photo.jpg', { type: 'image/jpeg' }));

      if (!questionIdRef.current) {
        if (!selectedCategoryId) {
          Toast.show({ content: '请先选择章节', icon: 'fail' });
          return;
        }
        const q = await createQuestion(selectedCategoryId, currentSubjectId || undefined);
        questionIdRef.current = q.data.id;
      }

      setUploading(true);
      const sts = await getStsToken();
      const key = `questions/user-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const url = await uploadToOss(compressed, sts.data, key);
      await addImage(questionIdRef.current, { image_url: url, image_type: type });
      setImages((prev) => [...prev, { url, type, local: photo.webPath! }]);
      triggerOcr(questionIdRef.current).catch(console.error);
      Toast.show({ content: '上传成功', icon: 'success' });
    } catch (err: any) {
      Toast.show({ content: err.message || '拍照失败', icon: 'fail' });
    } finally {
      setUploading(false);
    }
  };

  const handleDone = () => {
    if (questionIdRef.current) {
      navigate(`/questions/${questionIdRef.current}`);
    } else {
      navigate('/');
    }
  };

  const typeLabel: Record<string, string> = {
    original_question: '原题',
    wrong_solution: '错解',
    reference_answer: '参考答案',
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NavBar onBack={() => navigate(-1)} right={<Button size="small" color="primary" fill="outline" onClick={handleDone}>完成</Button>}>
        拍照录入
      </NavBar>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {!currentSubjectId && (
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <Empty description="请先选择科目" />
            <Button color="primary" size="small" onClick={() => navigate('/subjects')} style={{ marginTop: 12 }}>
              去选择科目
            </Button>
          </div>
        )}
        {currentSubjectId && (
          <>
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

            <Space wrap block style={{ marginBottom: 16 }}>
              {(['original_question', 'wrong_solution', 'reference_answer'] as const).map((t) => (
                <Button key={t} color="primary" fill="outline" onClick={() => takePhoto(t)} loading={uploading} disabled={!selectedCategoryId && !questionIdRef.current}>
                  {typeLabel[t]}
                </Button>
              ))}
            </Space>

            {images.map((img, idx) => (
              <Card key={idx} title={typeLabel[img.type]} style={{ marginBottom: 12 }}>
                <Image src={img.local || img.url} style={{ width: '100%', maxHeight: 200 }} fit="contain" />
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
