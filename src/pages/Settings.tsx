import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Preferences } from '@capacitor/preferences';
import { NavBar, List, Switch, Toast, Dialog, Button } from 'antd-mobile';
import { enableKeepAwake, disableKeepAwake } from '@/utils/keepAwake';
import { getCacheSize, formatSize, clearImageCache } from '@/utils/imageCache';

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [keepAwake, setKeepAwake] = useState(false);
  const [cacheSize, setCacheSize] = useState(0);
  const [clearVisible, setClearVisible] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);

  const loadCacheSize = async () => {
    const size = await getCacheSize();
    setCacheSize(size);
  };

  useEffect(() => {
    Preferences.get({ key: 'keep_awake' }).then(({ value }) => {
      setKeepAwake(value === 'true');
    });
    loadCacheSize();
  }, []);

  const handleKeepAwakeChange = async (checked: boolean) => {
    setKeepAwake(checked);
    await Preferences.set({ key: 'keep_awake', value: String(checked) });
    if (checked) {
      await enableKeepAwake();
    } else {
      await disableKeepAwake();
    }
    Toast.show({ content: checked ? '已开启保持亮屏' : '已关闭保持亮屏' });
  };

  const handleLogout = () => {
    setLogoutVisible(true);
  };

  const confirmLogout = async () => {
    await logout();
    setLogoutVisible(false);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NavBar onBack={() => navigate(-1)}>设置</NavBar>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <List header="用户信息">
          <List.Item extra={user?.phone || '-'}>手机号</List.Item>
        </List>

        <List header="通用设置">
          <List.Item
            extra={<Switch checked={keepAwake} onChange={handleKeepAwakeChange} />}
          >
            保持亮屏
          </List.Item>
          <List.Item
            extra={formatSize(cacheSize)}
            arrow
            onClick={() => { loadCacheSize(); Toast.show({ content: `图片缓存: ${formatSize(cacheSize)}` }); }}
          >
            图片缓存
          </List.Item>
          {cacheSize > 0 && (
            <List.Item
              onClick={() => setClearVisible(true)}
            >
              <span style={{ color: '#ff4d4f' }}>清空图片缓存</span>
            </List.Item>
          )}
        </List>

        <List header="导出管理">
          <List.Item arrow onClick={() => navigate('/pdf-history')}>
            历史PDF
          </List.Item>
        </List>

        <List header="关于">
          <List.Item onClick={() => Toast.show({ content: 'Korrection v1.0.0' })}>
            关于 App
          </List.Item>
        </List>
      </div>

      <div style={{ padding: 24, borderTop: '1px solid #eee' }}>
        <Button block color="danger" onClick={handleLogout}>
          退出账号
        </Button>
      </div>

      <Dialog
        visible={clearVisible}
        content={`确定清空图片缓存（${formatSize(cacheSize)}）？`}
        closeOnAction
        onClose={() => setClearVisible(false)}
        actions={[
          { key: 'cancel', text: '取消', onClick: () => setClearVisible(false) },
          {
            key: 'confirm',
            text: '清空',
            danger: true,
            bold: true,
            onClick: async () => {
              setClearVisible(false);
              await clearImageCache();
              setCacheSize(0);
              Toast.show({ content: '缓存已清空', icon: 'success' });
            },
          },
        ]}
      />

      <Dialog
        visible={logoutVisible}
        content="确定退出当前账号？"
        closeOnAction
        onClose={() => setLogoutVisible(false)}
        actions={[
          { key: 'cancel', text: '取消', onClick: () => setLogoutVisible(false) },
          { key: 'confirm', text: '确定', danger: true, bold: true, onClick: confirmLogout },
        ]}
      />
    </div>
  );
}
