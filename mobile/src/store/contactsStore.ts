import { create } from 'zustand';
import {
  type ContactItem,
  type ContactCreateParams,
  type ContactUpdateParams,
  type CategoryItem,
  listContacts as apiListContacts,
  getContact as apiGetContact,
  createContact as apiCreateContact,
  updateContact as apiUpdateContact,
  deleteContact as apiDeleteContact,
  listCategories as apiListCategories,
  createCategory as apiCreateCategory,
  deleteCategory as apiDeleteCategory,
  getCategoryDefaults as apiGetDefaults,
  updateCategoryDefaults as apiUpdateDefaults,
} from '../api/contacts';
import { extractApiError } from '../api/client';

interface ContactsStore {
  contacts: ContactItem[];
  categories: CategoryItem[];
  categoryDefaults: Record<string, Record<string, unknown>>;
  loading: boolean;
  error: string | null;

  loadContacts: (category?: string, isVip?: boolean, isBlocked?: boolean) => Promise<void>;
  loadCategories: () => Promise<void>;
  loadCategoryDefaults: () => Promise<void>;
  addContact: (params: ContactCreateParams) => Promise<boolean>;
  updateContact: (id: string, params: ContactUpdateParams) => Promise<boolean>;
  removeContact: (id: string) => Promise<boolean>;
  addCategory: (slug: string, label: string) => Promise<boolean>;
  removeCategory: (slug: string) => Promise<boolean>;
  saveCategoryDefaults: (defaults: Record<string, Record<string, unknown>>) => Promise<boolean>;
  reset: () => void;
}

export const useContactsStore = create<ContactsStore>((set) => ({
  contacts: [],
  categories: [],
  categoryDefaults: {},
  loading: false,
  error: null,

  loadContacts: async (category, isVip, isBlocked) => {
    set({ loading: true, error: null });
    try {
      const result = await apiListContacts(category, isVip, isBlocked);
      set({ contacts: result.items, loading: false });
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
    }
  },

  loadCategories: async () => {
    try {
      const result = await apiListCategories();
      set({ categories: result.categories });
    } catch {
      // silent
    }
  },

  loadCategoryDefaults: async () => {
    try {
      const result = await apiGetDefaults();
      set({ categoryDefaults: result.defaults });
    } catch {
      // silent
    }
  },

  addContact: async (params) => {
    set({ error: null });
    try {
      const entry = await apiCreateContact(params);
      set((state) => ({ contacts: [entry, ...state.contacts] }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  updateContact: async (id, params) => {
    set({ error: null });
    try {
      const updated = await apiUpdateContact(id, params);
      set((state) => ({
        contacts: state.contacts.map((c) => (c.id === id ? updated : c)),
      }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  removeContact: async (id) => {
    set({ error: null });
    try {
      await apiDeleteContact(id);
      set((state) => ({ contacts: state.contacts.filter((c) => c.id !== id) }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  addCategory: async (slug, label) => {
    set({ error: null });
    try {
      const cat = await apiCreateCategory(slug, label);
      set((state) => ({ categories: [...state.categories, cat] }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  removeCategory: async (slug) => {
    set({ error: null });
    try {
      await apiDeleteCategory(slug);
      set((state) => {
        const newDefaults = { ...state.categoryDefaults };
        delete newDefaults[slug];
        return {
          categories: state.categories.filter((c) => c.slug !== slug),
          categoryDefaults: newDefaults,
        };
      });
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  saveCategoryDefaults: async (defaults) => {
    set({ error: null });
    try {
      const result = await apiUpdateDefaults(defaults);
      set({ categoryDefaults: result.defaults });
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  reset: () =>
    set({ contacts: [], categories: [], categoryDefaults: {}, loading: false, error: null }),
}));
