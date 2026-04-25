import { create } from 'zustand';
import { Preferences } from '@capacitor/preferences';

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
    set({ token: null, user: null });
  },
  init: async () => {
    const { value: token } = await Preferences.get({ key: 'token' });
    if (token) {
      set({ token });
    }
    set({ isLoading: false });
  },
}));
