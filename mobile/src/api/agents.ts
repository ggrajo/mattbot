import { apiClient } from './client';

export interface VoiceSelection {
  voice_id: string | null;
  display_name?: string | null;
  provider_voice_id?: string | null;
}

export interface AgentResponse {
  id: string;
  display_name: string;
  function_type: string;
  is_default: boolean;
  status: string;
  voice: VoiceSelection | null;
  user_instructions: string | null;
  greeting_instructions: string | null;
  revision: number;
  created_at: string;
}

export interface AgentListResponse {
  items: AgentResponse[];
}

export interface VoiceCatalogItem {
  id: string;
  provider_voice_id: string;
  display_name: string;
  locale: string;
  gender_tag: string | null;
  preview_url: string | null;
  sort_order: number;
}

export interface VoiceCatalogResponse {
  items: VoiceCatalogItem[];
}

export interface PromptSuggestionItem {
  id: string;
  title: string;
  text: string;
  sort_order: number;
}

export interface PromptSuggestionsResponse {
  items: PromptSuggestionItem[];
}

export async function fetchAgents(): Promise<AgentListResponse> {
  const { data } = await apiClient.get('/agents');
  return data;
}

export async function createDefaultAgent(body?: {
  display_name?: string;
  voice_id?: string;
  user_instructions?: string;
}): Promise<AgentResponse> {
  const { data } = await apiClient.post('/agents/default', body ?? {});
  return data;
}

export async function updateAgent(
  agentId: string,
  patch: {
    display_name?: string;
    voice_id?: string | null;
    user_instructions?: string | null;
    greeting_instructions?: string | null;
    expected_revision?: number;
  },
): Promise<AgentResponse> {
  const { data } = await apiClient.patch(`/agents/${agentId}`, patch);
  return data;
}

export async function fetchVoices(): Promise<VoiceCatalogResponse> {
  const { data } = await apiClient.get('/voices');
  return data;
}

export async function fetchPromptSuggestions(): Promise<PromptSuggestionsResponse> {
  const { data } = await apiClient.get('/prompt-suggestions');
  return data;
}
