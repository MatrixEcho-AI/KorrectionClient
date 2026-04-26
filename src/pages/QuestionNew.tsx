import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { createQuestion, uploadImage, triggerOcr, triggerAutoSummary } from '@/api/questions';
import { useCategoryStore } from '@/stores/categoryStore';
import { useSubjectStore } from '@/stores/subjectStore';
import { enhanceDocument } from '@/utils/image';
import { NavBar, Button, Cascader, Toast, Image, Card, Empty, Input } from 'antd-mobile';
import { DeleteOutline } from 'antd-mobile-icons';
import Cropper from 'cropperjs';

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
  const [questionName, setQuestionName] = useState('');
  const [images, setImages] = useState<{ type: string; file: File; preview: string }[]>([]);
  const [cascaderVisible, setCascaderVisible] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [editorVisible, setEditorVisible] = useState(false);
  const [editorImage, setEditorImage] = useState('');
  const [editorType, setEditorType] = useState('');
  const [sharpenEnabled, setSharpenEnabled] = useState(true);
  const cropperRef = useRef<Cropper | null>(null);
  const editorImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (currentSubjectId) {
      fetchCategories(currentSubjectId);
    }
  }, [currentSubjectId]);

  useEffect(() => {
    if (editorVisible && editorImgRef.current) {
      const cropper = new Cropper(editorImgRef.current, {
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.9,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
      });
      cropperRef.current = cropper;
      return () => {
        cropper.destroy();
        cropperRef.current = null;
      };
    }
  }, [editorVisible, editorImage]);

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
      setEditorImage(photo.webPath);
      setEditorType(type);
      setSharpenEnabled(true);
      setEditorVisible(true);
    } catch (err: any) {
      Toast.show({ content: err.message || '拍照失败', icon: 'fail' });
    }
  };

  const handleEditorConfirm = async () => {
    if (!cropperRef.current) return;
    setEditorVisible(false);

    const canvas = cropperRef.current.getCroppedCanvas({
      maxWidth: 1920,
      maxHeight: 1920,
      fillColor: '#fff',
    });

    if (!canvas) {
      Toast.show({ content: '裁剪失败', icon: 'fail' });
      return;
    }

    if (sharpenEnabled) {
      enhanceDocument(canvas);
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Canvas to blob failed'))),
        'image/jpeg',
        0.92
      );
    });

    const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
    const preview = URL.createObjectURL(file);
    setImages((prev) => [...prev, { type: editorType, file, preview }]);
    setEditorImage('');
    setEditorType('');
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const item = prev[index];
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDone = async () => {
    if (images.length === 0) {
      navigate('/');
      return;
    }
    if (!selectedCategoryId) {
      Toast.show({ content: '请先选择章节', icon: 'fail' });
      return;
    }

    setUploading(true);
    try {
      const q = await createQuestion(selectedCategoryId, currentSubjectId || undefined, questionName.trim() || undefined);
      const questionId = q.data.id;

      for (const img of images) {
        const formData = new FormData();
        formData.append('image', img.file);
        formData.append('image_type', img.type);
        formData.append('name', '');
        await uploadImage(questionId, formData);
      }

      triggerOcr(questionId).catch(console.error);
      triggerAutoSummary(questionId).catch(console.error);
      Toast.show({ content: '上传成功', icon: 'success' });
      navigate(`/questions/${questionId}`, { replace: true });
    } catch (err: any) {
      Toast.show({ content: err.message || '上传失败', icon: 'fail' });
      setUploading(false);
    }
  };

  const typeLabel: Record<string, string> = {
    original_question: '原题',
    wrong_solution: '错解',
    reference_answer: '参考答案',
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NavBar onBack={() => navigate(-1)} right={<Button size="small" color="primary" fill="outline" onClick={handleDone} loading={uploading} disabled={!selectedCategoryId || images.length === 0 || uploading}>完成</Button>}>
        拍照录入
      </NavBar>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: 16, paddingBottom: 80 }}>
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

            <Input
              placeholder="给这道题起个名字（可选）"
              value={questionName}
              onChange={(val) => setQuestionName(val)}
              style={{ marginBottom: 16, marginTop: 12 }}
            />

            {images.map((img, idx) => (
              <Card
                key={idx}
                title={typeLabel[img.type]}
                style={{ marginBottom: 12 }}
                extra={
                  <Button size="small" fill="none" style={{ color: '#ff3141' }} onClick={() => handleRemoveImage(idx)}>
                    <DeleteOutline />
                  </Button>
                }
              >
                <Image src={img.preview} style={{ width: '100%' }} fit="contain" />
              </Card>
            ))}
          </>
        )}
      </div>

      {currentSubjectId && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: 12, background: '#fff', borderTop: '1px solid #eee', zIndex: 100, display: 'flex', justifyContent: 'center', gap: 8 }}>
          {(['original_question', 'wrong_solution', 'reference_answer'] as const).map((t) => (
            <Button key={t} color="primary" fill="outline" onClick={() => takePhoto(t)} loading={uploading}>
              {typeLabel[t]}
            </Button>
          ))}
        </div>
      )}

      {editorVisible && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#000', display: 'flex', flexDirection: 'column' }}>
          <NavBar
            onBack={() => { setEditorVisible(false); setEditorImage(''); setEditorType(''); }}
            right={<Button size="small" color="primary" onClick={handleEditorConfirm}>确认</Button>}
          >
            编辑图片
          </NavBar>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              ref={editorImgRef}
              src={editorImage}
              alt="edit"
              style={{ maxWidth: '100%', maxHeight: '100%', display: 'block' }}
            />
          </div>
          <div style={{ padding: 12, background: '#1a1a1a', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
            <Button size="small" fill="outline" style={{ color: '#fff' }} onClick={() => { cropperRef.current?.rotate(-90); }}>
              左旋90°
            </Button>
            <Button size="small" fill="outline" style={{ color: '#fff' }} onClick={() => { cropperRef.current?.rotate(90); }}>
              右旋90°
            </Button>
            <Button
              size="small"
              fill={sharpenEnabled ? 'solid' : 'outline'}
              color={sharpenEnabled ? 'primary' : 'default'}
              onClick={() => setSharpenEnabled(!sharpenEnabled)}
            >
              {sharpenEnabled ? '锐化: 开' : '锐化: 关'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
