import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { createQuestion, addImage, triggerOcr } from '@/api/questions';
import { getStsToken } from '@/api/oss';
import { useCategoryStore } from '@/stores/categoryStore';
import { compressImage, uploadToOss } from '@/utils/image';

export default function QuestionNew() {
  const navigate = useNavigate();
  const { categories } = useCategoryStore();
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [images, setImages] = useState<{ url: string; type: string; local: string }[]>([]);
  const [error, setError] = useState('');
  const questionIdRef = useRef<number | null>(null);

  const takePhoto = async (type: string) => {
    setError('');
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
        if (!categoryId) {
          setError('请先选择科目/章节');
          return;
        }
        const q = await createQuestion(Number(categoryId));
        questionIdRef.current = q.data.id;
      }

      const sts = await getStsToken();
      const key = `questions/user-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const url = await uploadToOss(compressed, sts.data, key);

      await addImage(questionIdRef.current, { image_url: url, image_type: type });
      setImages((prev) => [...prev, { url, type, local: photo.webPath! }]);

      // 异步触发 OCR
      triggerOcr(questionIdRef.current).catch(console.error);
    } catch (err: any) {
      setError(err.message || '拍照失败');
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
    <div className="flex h-full flex-col">
      <header className="flex items-center border-b px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-gray-500">
          ←
        </button>
        <h1 className="mx-auto text-lg font-bold">拍照录入</h1>
        <button onClick={handleDone} className="text-primary">
          完成
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {error && <p className="mb-3 text-sm text-danger">{error}</p>}

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">选择章节</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            disabled={!!questionIdRef.current}
          >
            <option value="">请选择</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {'　'.repeat(c.level - 1) + c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-3">
          {(['original_question', 'wrong_solution', 'reference_answer'] as const).map((t) => (
            <button
              key={t}
              onClick={() => takePhoto(t)}
              className="flex flex-col items-center rounded-lg border bg-gray-50 py-6 active:bg-gray-100"
            >
              <span className="text-2xl">📷</span>
              <span className="mt-1 text-xs">{typeLabel[t]}</span>
            </button>
          ))}
        </div>

        {images.length > 0 && (
          <div className="space-y-3">
            {images.map((img, idx) => (
              <div key={idx} className="rounded-lg border bg-white p-2">
                <div className="mb-1 text-xs font-medium text-gray-500">{typeLabel[img.type]}</div>
                <img src={img.local || img.url} alt="" className="h-40 w-full rounded-md object-contain" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
