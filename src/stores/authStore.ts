import { create } from 'zustand';
import { Preferences } from '@capacitor/preferences';
import { getMe } from '@/api/auth';

interface AuthState {
  token: string | null;
  user: { id: number; phone: string } | null;
  isLoading: boolean;
  setToken: (token: string) => void;
  setUser: (user: { id: number; phone: string }) => void;
  logout: () => Promise<void>;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,
  setToken: (token) => set({ token }),
  setUser: (user) => set({ user }),
  logout: async () => {
    await Preferences.remove({ key: 'token' });
    await Preferences.remove({ key: 'user' });
    set({ token: null, user: null });
  },
  init: async () => {
    const { value: token } = await Preferences.get({ key: 'token' });
    const { value: userStr } = await Preferences.get({ key: 'user' });
    let user = null;
    if (userStr) {
      try { user = JSON.parse(userStr); } catch { }
    }
    if (token) {
      try {
        await getMe();
        set({ token, user });
      } catch {
        await Preferences.remove({ key: 'token' });
        await Preferences.remove({ key: 'user' });
        set({ token: null, user: null });
      }
    }
    set({ isLoading: false });
  },
}));
