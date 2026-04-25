import { useState, useRef, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { sendCode, login } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { Form, Input, Button, Space, Toast } from 'antd-mobile';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const { setToken, setUser } = useAuthStore();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = (seconds: number) => {
    setCountdown(seconds);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      Toast.show({ content: '请输入有效的手机号', icon: 'fail' });
      return;
    }
    setLoading(true);
    try {
      const res = await sendCode(phone);
      startCountdown(res.data.expiresIn);
      Toast.show({ content: '验证码已发送', icon: 'success' });
    } catch (err: any) {
      Toast.show({ content: err.message || '发送失败', icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone) || !/^\d{6}$/.test(code)) {
      Toast.show({ content: '请正确填写手机号和验证码', icon: 'fail' });
      return;
    }
    setLoading(true);
    try {
      const res = await login(phone, code);
      await Preferences.set({ key: 'token', value: res.data.token });
      setToken(res.data.token);
      setUser(res.data.user);
    } catch (err: any) {
      Toast.show({ content: err.message || '登录失败', icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 48, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <Space direction="vertical" block style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1677ff', margin: 0 }}>Korrection</h1>
        <p style={{ color: '#999', margin: 0 }}>智能错题本</p>
      </Space>

      <Form layout="vertical">
        <Form.Item label="手机号">
          <Input
            placeholder="请输入手机号"
            maxLength={11}
            value={phone}
            onChange={(v) => setPhone(v.replace(/\D/g, ''))}
            type="number"
          />
        </Form.Item>

        <Form.Item label="验证码" extra={
          <Button
            size="small"
            color="primary"
            fill="outline"
            onClick={handleSendCode}
            disabled={countdown > 0 || loading}
            style={{ marginTop: 4 }}
          >
            {countdown > 0 ? `${countdown}s` : '获取验证码'}
          </Button>
        }>
          <Input
            placeholder="请输入验证码"
            maxLength={6}
            value={code}
            onChange={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            type="number"
          />
        </Form.Item>

        <Button
          block
          color="primary"
          size="large"
          loading={loading}
          onClick={handleLogin}
        >
          登录 / 注册
        </Button>
      </Form>
    </div>
  );
}
