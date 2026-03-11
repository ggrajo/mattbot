import { create } from 'zustand';
import {
  type AgentResponse,
  type VoiceCatalogItem,
  type PromptSuggestionItem,
  fetchAgents,
  createDefaultAgent,
  updateAgent as apiUpdateAgent,
  fetchVoices,
  fetchPromptSuggestions,
} from '../api/agents';
import { extractApiError } from '../api/client';

interface AgentStore {
  agent: AgentResponse | null;
  voices: VoiceCatalogItem[];
  suggestions: PromptSuggestionItem[];
  loading: boolean;
  error: string | null;

  loadAgent: () => Promise<void>;
  updateAgent: (id: string, patch: Parameters<typeof apiUpdateAgent>[1]) => Promise<void>;
  loadVoices: () => Promise<void>;
  loadSuggestions: () => Promise<void>;
  reset: () => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  agent: null,
  voices: [],
  suggestions: [],
  loading: false,
  error: null,

  loadAgent: async () => {
    set({ loading: true, error: null });
    try {
      const { items } = await fetchAgents();
      if (items.length > 0) {
        set({ agent: items[0], loading: false });
      } else {
        const agent = await createDefaultAgent();
        set({ agent, loading: false });
      }
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
    }
  },

  updateAgent: async (id, patch) => {
    set({ loading: true, error: null });
    try {
      const updated = await apiUpdateAgent(id, patch);
      set({ agent: updated, loading: false });
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
    }
  },

  loadVoices: async () => {
    try {
      const { items } = await fetchVoices();
      set({ voices: items });
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
    }
  },

  loadSuggestions: async () => {
    try {
      const { items } = await fetchPromptSuggestions();
      set({ suggestions: items });
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
    }
  },

  reset: () => {
    set({ agent: null, voices: [], suggestions: [], loading: false, error: null });
  },
}));
