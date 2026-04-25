import { useState, useRef, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { sendCode, login } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
    setError('');
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入有效的手机号');
      return;
    }
    setLoading(true);
    try {
      const res = await sendCode(phone);
      startCountdown(res.data.expiresIn);
    } catch (err: any) {
      setError(err.message || '发送失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    if (!/^1[3-9]\d{9}$/.test(phone) || !/^\d{6}$/.test(code)) {
      setError('请正确填写手机号和验证码');
      return;
    }
    setLoading(true);
    try {
      const res = await login(phone, code);
      await Preferences.set({ key: 'token', value: res.data.token });
      setToken(res.data.token);
      setUser(res.data.user);
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <h1 className="mb-2 text-3xl font-bold text-primary">Korrection</h1>
      <p className="mb-8 text-secondary">智能错题本</p>

      <div className="w-full space-y-4">
        <input
          type="tel"
          placeholder="手机号"
          maxLength={11}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />

        <div className="flex gap-2">
          <input
            type="number"
            placeholder="验证码"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleSendCode}
            disabled={countdown > 0 || loading}
            className="whitespace-nowrap rounded-lg bg-gray-100 px-4 py-3 text-sm font-medium text-primary disabled:text-gray-400"
          >
            {countdown > 0 ? `${countdown}s` : '获取验证码'}
          </button>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full rounded-lg bg-primary py-3 font-medium text-white disabled:opacity-60"
        >
          {loading ? '登录中...' : '登录 / 注册'}
        </button>
      </div>
    </div>
  );
}
