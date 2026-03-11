import { create } from 'zustand';
import { agentsApi, Agent } from '../api/agents';
import { extractApiError } from '../api/client';

interface AgentStore {
  agents: Agent[];
  currentAgent: Agent | null;
  loading: boolean;
  error: string | null;

  fetchAgents: () => Promise<void>;
  fetchAgent: (agentId: string) => Promise<void>;
  updateAgent: (agentId: string, data: Partial<Agent>) => Promise<Agent | null>;
  createAgent: (data: Partial<Agent>) => Promise<Agent | null>;
}

export const useAgentStore = create<AgentStore>((set) => ({
  agents: [],
  currentAgent: null,
  loading: false,
  error: null,

  fetchAgents: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await agentsApi.list();
      const active = data.find((a) => a.is_active) ?? data[0] ?? null;
      set({ agents: data, currentAgent: active, loading: false });
    } catch (err) {
      set({ loading: false, error: extractApiError(err) });
    }
  },

  fetchAgent: async (agentId) => {
    set({ loading: true, error: null });
    try {
      const { data } = await agentsApi.get(agentId);
      set({ currentAgent: data, loading: false });
    } catch (err) {
      set({ loading: false, error: extractApiError(err) });
    }
  },

  updateAgent: async (agentId, updates) => {
    set({ loading: true, error: null });
    try {
      const { data } = await agentsApi.update(agentId, updates);
      set((state) => ({
        agents: state.agents.map((a) => (a.id === agentId ? data : a)),
        currentAgent: state.currentAgent?.id === agentId ? data : state.currentAgent,
        loading: false,
      }));
      return data;
    } catch (err) {
      set({ loading: false, error: extractApiError(err) });
      return null;
    }
  },

  createAgent: async (agentData) => {
    set({ loading: true, error: null });
    try {
      const { data } = await agentsApi.create(agentData);
      set((state) => ({
        agents: [...state.agents, data],
        currentAgent: data,
        loading: false,
      }));
      return data;
    } catch (err) {
      set({ loading: false, error: extractApiError(err) });
      return null;
    }
  },
}));
