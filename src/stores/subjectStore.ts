import { create } from 'zustand';
import { Preferences } from '@capacitor/preferences';
import { getSubjects, type Subject } from '@/api/subjects';

interface SubjectState {
  subjects: Subject[];
  currentSubjectId: number | null;
  loading: boolean;
  fetch: () => Promise<void>;
  setCurrent: (id: number | null) => Promise<void>;
  init: () => Promise<void>;
}

const STORAGE_KEY = 'current_subject_id';

export const useSubjectStore = create<SubjectState>((set, get) => ({
  subjects: [],
  currentSubjectId: null,
  loading: false,
  fetch: async () => {
    set({ loading: true });
    try {
      const res = await getSubjects();
      const list = res.data;
      set({ subjects: list });
      // 如果当前选中的科目不在列表里，自动重置
      const current = get().currentSubjectId;
      if (current && !list.find((s) => s.id === current)) {
        set({ currentSubjectId: null });
        await Preferences.remove({ key: STORAGE_KEY });
      }
    } finally {
      set({ loading: false });
    }
  },
  setCurrent: async (id) => {
    set({ currentSubjectId: id });
    if (id) {
      await Preferences.set({ key: STORAGE_KEY, value: String(id) });
    } else {
      await Preferences.remove({ key: STORAGE_KEY });
    }
  },
  init: async () => {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (value) {
      set({ currentSubjectId: Number(value) });
    }
  },
}));
