import { create } from 'zustand';
import {
  type BlockEntry,
  type AddBlockParams,
  listBlocks as apiListBlocks,
  addBlock as apiAddBlock,
  removeBlock as apiRemoveBlock,
} from '../api/blocks';
import { extractApiError } from '../api/client';

interface BlockStore {
  items: BlockEntry[];
  loading: boolean;
  error: string | null;

  loadBlocks: () => Promise<void>;
  addBlock: (params: AddBlockParams) => Promise<boolean>;
  removeBlock: (blockId: string) => Promise<boolean>;
  reset: () => void;
}

export const useBlockStore = create<BlockStore>((set) => ({
  items: [],
  loading: false,
  error: null,

  loadBlocks: async () => {
    set({ loading: true, error: null });
    try {
      const result = await apiListBlocks();
      set({ items: result.items, loading: false });
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
    }
  },

  addBlock: async (params) => {
    set({ error: null });
    try {
      const entry = await apiAddBlock(params);
      set((state) => ({ items: [entry, ...state.items] }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  removeBlock: async (blockId) => {
    set({ error: null });
    try {
      await apiRemoveBlock(blockId);
      set((state) => ({ items: state.items.filter((i) => i.id !== blockId) }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  reset: () => set({ items: [], loading: false, error: null }),
}));
