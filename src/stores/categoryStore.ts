import { create } from 'zustand';
import { getCategories, type Category } from '@/api/categories';

interface CategoryState {
  categories: Category[];
  loading: boolean;
  fetch: (subject_id?: number) => Promise<void>;
  getTree: () => Category[];
  getPath: (id: number) => string;
}

function buildTree(list: Category[]): Category[] {
  const map = new Map<number, Category & { children?: Category[] }>();
  list.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: Category[] = [];
  list.forEach((c) => {
    if (c.parent_id === 0) {
      roots.push(map.get(c.id)!);
    } else {
      const parent = map.get(c.parent_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(map.get(c.id)!);
      }
    }
  });
  return roots;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  loading: false,
  fetch: async (subject_id?: number) => {
    set({ loading: true });
    try {
      const res = await getCategories(subject_id);
      set({ categories: res.data });
    } finally {
      set({ loading: false });
    }
  },
  getTree: () => buildTree(get().categories),
  getPath: (id: number) => {
    const list = get().categories;
    const map = new Map(list.map((c) => [c.id, c]));
    const parts: string[] = [];
    let curr = map.get(id);
    while (curr) {
      parts.unshift(curr.name);
      curr = map.get(curr.parent_id);
    }
    return parts.join(' / ') || '-';
  },
}));
