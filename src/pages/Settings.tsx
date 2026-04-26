import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Preferences } from '@capacitor/preferences';
import { NavBar, List, Switch, Toast, Dialog, Button } from 'antd-mobile';

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [keepAwake, setKeepAwake] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);

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
