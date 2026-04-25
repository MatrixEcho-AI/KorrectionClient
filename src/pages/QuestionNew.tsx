import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { createQuestion, addImage, triggerOcr } from '@/api/questions';
import { getStsToken } from '@/api/oss';
import { useCategoryStore } from '@/stores/categoryStore';
import { useSubjectStore } from '@/stores/subjectStore';
import { compressImage, uploadToOss } from '@/utils/image';
import { NavBar, Button, Picker, Toast, Image, Space, Card, Empty } from 'antd-mobile';

export default function QuestionNew() {
  const navigate = useNavigate();
  const { categories, fetch: fetchCategories } = useCategoryStore();
  const { currentSubjectId } = useSubjectStore();
  const [categoryId, setCategoryId] = useState<number[]>([]);
  const [images, setImages] = useState<{ url: string; type: string; local: string }[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const questionIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (currentSubjectId) {
      fetchCategories(currentSubjectId);
    }
  }, [currentSubjectId]);

  const pickerColumns = [
    categories.map((c) => ({ label: '　'.repeat(c.level - 1) + c.name, value: c.id })),
  ];

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
        if (!categoryId[0]) {
          Toast.show({ content: '请先选择章节', icon: 'fail' });
          return;
        }
        const q = await createQuestion(categoryId[0], currentSubjectId || undefined);
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

  const selectedCategoryName = categories.find((c) => c.id === categoryId[0])?.name || '请选择章节';

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
            <Button block fill="outline" onClick={() => setPickerVisible(true)} style={{ marginBottom: 16 }}>
              {selectedCategoryName}
            </Button>

            <Picker
              columns={pickerColumns}
              visible={pickerVisible}
              onClose={() => setPickerVisible(false)}
              value={categoryId}
              onConfirm={(v) => setCategoryId(v as number[])}
            />

            <Space wrap block style={{ marginBottom: 16 }}>
              {(['original_question', 'wrong_solution', 'reference_answer'] as const).map((t) => (
                <Button key={t} color="primary" fill="outline" onClick={() => takePhoto(t)} loading={uploading} disabled={!categoryId[0] && !questionIdRef.current}>
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
