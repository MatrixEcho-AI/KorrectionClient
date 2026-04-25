import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Preferences } from '@capacitor/preferences';
import { NavBar, List, Switch, Toast, Dialog } from 'antd-mobile';
import { RightOutline } from 'antd-mobile-icons';

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [keepAwake, setKeepAwake] = useState(false);

  useEffect(() => {
    Preferences.get({ key: 'keep_awake' }).then(({ value }) => {
      setKeepAwake(value === 'true');
    });
  }, []);

  const handleKeepAwakeChange = async (checked: boolean) => {
    setKeepAwake(checked);
    await Preferences.set({ key: 'keep_awake', value: String(checked) });
    // TODO: integrate @capacitor-community/keep-awake to actually control screen
    Toast.show({ content: checked ? '已开启保持亮屏' : '已关闭保持亮屏' });
  };

  const handleLogout = async () => {
    const result = await Dialog.confirm({ content: '确定退出当前账号？' });
    if (result) {
      await logout();
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NavBar onBack={() => navigate(-1)}>设置</NavBar>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <List header="用户信息">
          <List.Item extra={user?.phone || '-'}>手机号</List.Item>
        </List>

        <List header="通用设置">
          <List.Item
            extra={<Switch checked={keepAwake} onChange={handleKeepAwakeChange} />}
          >
            保持亮屏
          </List.Item>
        </List>

        <List header="关于">
          <List.Item extra={<RightOutline />} onClick={() => Toast.show({ content: 'Korrection v1.0.0' })}>
            关于 App
          </List.Item>
        </List>

        <div style={{ padding: 24 }}>
          <List>
            <List.Item onClick={handleLogout} style={{ color: '#ff3141', justifyContent: 'center' }}>
              退出账号
            </List.Item>
          </List>
        </div>
      </div>
    </div>
  );
}
