import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuestion, deleteQuestion, updateQuestion, getPendingRedos, rollbackQuestion, updateImageOcr, type Question, type RedoSession } from '@/api/questions';
import { NavBar, Button, SpinLoading, Image, Tag, Toast, Dialog, ImageViewer, ActionSheet, TextArea } from 'antd-mobile';

const statusMap: Record<string, string> = {
  photo: '拍照',
  summary: '总结',
  review: '复盘',
  redo: '重做',
  completed: '完成',
};

const typeLabel: Record<string, string> = {
  original_question: '原题',
  wrong_solution: '错解',
  reference_answer: '参考答案',
};

const rollbackOptions: Record<string, { text: string; key: string }[]> = {
  summary: [{ text: '拍照阶段', key: 'photo' }],
  review: [
    { text: '总结阶段', key: 'summary' },
    { text: '拍照阶段', key: 'photo' },
  ],
  redo: [
    { text: '复盘阶段', key: 'review' },
    { text: '总结阶段', key: 'summary' },
    { text: '拍照阶段', key: 'photo' },
  ],
  completed: [
    { text: '重做阶段', key: 'redo' },
    { text: '复盘阶段', key: 'review' },
    { text: '总结阶段', key: 'summary' },
    { text: '拍照阶段', key: 'photo' },
  ],
};

export default function QuestionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [q, setQ] = useState<Question | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pendingRedos, setPendingRedos] = useState<RedoSession[]>([]);
  const [expandedOcr, setExpandedOcr] = useState<Record<number, boolean>>({});
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [rollbackVisible, setRollbackVisible] = useState(false);
  const [editingOcrId, setEditingOcrId] = useState<number | null>(null);
  const [editingOcrText, setEditingOcrText] = useState('');

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getQuestion(Number(id));
      setQ(res.data);
      setDetail(res.data);
      if (res.data.status === 'redo') {
        try {
          const redoRes = await getPendingRedos(Number(id));
          setPendingRedos(redoRes.data);
        } catch {
          setPendingRedos([]);
        }
      } else {
        setPendingRedos([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleOcr = (imgId: number) => {
    setExpandedOcr((prev) => ({ ...prev, [imgId]: !prev[imgId] }));
  };

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <SpinLoading color="primary" />
      </div>
    );
  }

  if (!q) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#999' }}>题目不存在</div>
        <Button style={{ marginTop: 16 }} onClick={() => navigate('/')}>返回首页</Button>
      </div>
    );
  }

  const nextAction = () => {
    switch (q.status) {
      case 'photo':
        navigate(`/questions/${id}/summary`);
        break;
    }
  };

  const handleComplete = async () => {
    await updateQuestion(Number(id), { status: 'completed' });
    Toast.show({ content: '已标记为完成', icon: 'success' });
    load();
  };

  const handleDeleteClick = () => {
    setDeleteVisible(true);
  };

  const confirmDelete = async () => {
    await deleteQuestion(Number(id));
    Toast.show({ content: '已删除', icon: 'success' });
    setDeleteVisible(false);
    navigate('/');
  };

  const handleRollback = async (targetStatus: string) => {
    setRollbackVisible(false);
    try {
      await rollbackQuestion(Number(id), targetStatus);
      Toast.show({ content: `已回退到${statusMap[targetStatus]}阶段`, icon: 'success' });
      load();
    } catch (err: any) {
      Toast.show({ content: err.message || '回退失败', icon: 'fail' });
    }
  };

  const startEditOcr = (imgId: number, currentText: string) => {
    setEditingOcrId(imgId);
    setEditingOcrText(currentText);
  };

  const cancelEditOcr = () => {
    setEditingOcrId(null);
    setEditingOcrText('');
  };

  const saveEditOcr = async (imgId: number) => {
    try {
      await updateImageOcr(Number(id), imgId, editingOcrText);
      Toast.show({ content: 'OCR 已更新', icon: 'success' });
      setEditingOcrId(null);
      load();
    } catch (err: any) {
      Toast.show({ content: err.message || '更新失败', icon: 'fail' });
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NavBar
        onBack={() => navigate(-1)}
        right={
          <Tag color="default" fill="outline">{statusMap[q.status]}</Tag>
        }
      >
        题目详情
      </NavBar>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: 16 }}>
        <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
          <div>章节: {q.category_name || '-'}</div>
          <div>复习次数: {q.review_count}</div>
          <div>最后复盘: {q.last_review_at ? new Date(q.last_review_at).toLocaleString() : '-'}</div>
        </div>

        {detail?.tags?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {detail.tags.map((t: any) => (
              <Tag key={t.id} color="primary" fill="outline">{t.name}</Tag>
            ))}
          </div>
        )}

        {q.reason_text && (
          <div style={{ marginBottom: 16, borderRadius: 8, border: '1px solid #eee', padding: 12, background: '#fff' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#666' }}>错题原因</div>
            <div style={{ marginTop: 4, fontSize: 14, color: '#333' }}>{q.reason_text}</div>
          </div>
        )}

        {(() => {
          const groups: Record<string, any[]> = {};
          (detail?.images || []).forEach((img: any) => {
            if (!groups[img.image_type]) groups[img.image_type] = [];
            groups[img.image_type].push(img);
          });
          return Object.entries(groups).map(([type, imgs]) => (
            <div key={type} style={{ marginBottom: 16, borderRadius: 8, border: '1px solid #eee', padding: 12, background: '#fff' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#666', marginBottom: 8 }}>{typeLabel[type] || type}</div>
              {imgs.map((img: any) => (
                <div key={img.id} style={{ marginBottom: 8 }}>
                  <Image
                    src={img.image_url}
                    style={{ width: '100%', maxHeight: 192, borderRadius: 4 }}
                    fit="contain"
                    onClick={() => {
                      const allImages = detail?.images || [];
                      const idx = allImages.findIndex((i: any) => i.id === img.id);
                      setViewerIndex(idx >= 0 ? idx : 0);
                      setViewerVisible(true);
                    }}
                  />
                  {img.ocr_text && (
                    <div style={{ marginTop: 8 }}>
                      {editingOcrId === img.id ? (
                        <div>
                          <TextArea
                            value={editingOcrText}
                            onChange={setEditingOcrText}
                            rows={4}
                            style={{ fontSize: 12 }}
                          />
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <Button size="small" fill="outline" onClick={cancelEditOcr}>
                              取消
                            </Button>
                            <Button size="small" color="primary" onClick={() => saveEditOcr(img.id)}>
                              保存
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ position: 'relative' }}>
                            <div
                              style={{
                                padding: 8,
                                background: '#f5f5f5',
                                borderRadius: 4,
                                fontSize: 12,
                                color: '#666',
                                whiteSpace: 'pre-wrap',
                                overflow: 'hidden',
                                maxHeight: expandedOcr[img.id] ? undefined : 68,
                              }}
                            >
                              {img.ocr_text}
                            </div>
                            {!expandedOcr[img.id] && (
                              <div
                                style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  height: 24,
                                  background: 'linear-gradient(to bottom, rgba(245,245,245,0) 0%, rgba(245,245,245,0.85) 60%, rgba(245,245,245,1) 100%)',
                                  pointerEvents: 'none',
                                }}
                              />
                            )}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '4px 0 2px',
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                color: '#999',
                                cursor: 'pointer',
                                userSelect: 'none',
                              }}
                              onClick={() => toggleOcr(img.id)}
                            >
                              {expandedOcr[img.id] ? '▲ 收起' : '▼ 展开'}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: '#1677ff',
                                cursor: 'pointer',
                                userSelect: 'none',
                              }}
                              onClick={() => startEditOcr(img.id, img.ocr_text)}
                            >
                              编辑
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ));
        })()}

        {q.status === 'redo' && pendingRedos.length > 0 && (
          <div style={{ marginBottom: 16, borderRadius: 8, border: '1px solid #eee', padding: 12, background: '#fff' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#666', marginBottom: 8 }}>待做重做题</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingRedos.map((session) => (
                <div
                  key={session.id}
                  onClick={() => navigate(`/questions/${q.id}/redo?sessionId=${session.id}`)}
                  style={{
                    padding: 10,
                    borderRadius: 6,
                    background: '#f5f5f5',
                    fontSize: 13,
                    color: '#333',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ color: '#1677ff', fontWeight: 500 }}>#{session.id}：</span>
                  {session.question.question}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: 12, borderTop: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {q.status === 'photo' && (
          <Button block color="primary" size="large" onClick={nextAction}>去总结</Button>
        )}

        {q.status === 'redo' && (
          <Button block color="primary" size="large" onClick={handleComplete}>标记为完成</Button>
        )}
        {q.status !== 'photo' && (
          <Button block fill="outline" size="large" color="primary" onClick={() => setRollbackVisible(true)}>
            回退状态
          </Button>
        )}
        <Button block fill="outline" size="large" color="danger" onClick={handleDeleteClick}>
          删除题目
        </Button>
      </div>

      <Dialog
        visible={deleteVisible}
        content="确定删除这道题？可在回收站恢复。"
        closeOnAction
        onClose={() => setDeleteVisible(false)}
        actions={[
          { key: 'cancel', text: '取消', onClick: () => setDeleteVisible(false) },
          { key: 'confirm', text: '确定', danger: true, bold: true, onClick: confirmDelete },
        ]}
      />

      <ActionSheet
        visible={rollbackVisible}
        actions={rollbackOptions[q.status]?.map((opt) => ({
          text: opt.text,
          key: opt.key,
          onClick: () => handleRollback(opt.key),
        })) || []}
        onClose={() => setRollbackVisible(false)}
      />

      <ImageViewer.Multi
        images={detail?.images?.map((i: any) => i.image_url) || []}
        visible={viewerVisible}
        defaultIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />
    </div>
  );
}
