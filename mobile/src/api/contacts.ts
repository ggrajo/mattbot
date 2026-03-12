import { apiClient } from './client';

export interface ContactItem {
  id: string;
  phone_last4: string;
  display_name: string | null;
  company: string | null;
  relationship: string | null;
  email: string | null;
  notes: string | null;
  category: string;
  is_vip: boolean;
  is_blocked: boolean;
  block_reason: string | null;
  ai_temperament_preset: string | null;
  ai_greeting_template: string | null;
  ai_swearing_rule: string | null;
  ai_max_call_length_seconds: number | null;
  has_custom_greeting: boolean;
  has_custom_instructions: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactCreateParams {
  phone_number: string;
  display_name?: string;
  company?: string;
  relationship?: string;
  email?: string;
  notes?: string;
  category?: string;
  is_vip?: boolean;
  is_blocked?: boolean;
  block_reason?: string;
  ai_temperament_preset?: string;
  ai_greeting_template?: string;
  ai_greeting_instructions?: string;
  ai_swearing_rule?: string;
  ai_max_call_length_seconds?: number;
  ai_custom_instructions?: string;
}

export interface ContactUpdateParams {
  display_name?: string;
  company?: string;
  relationship?: string;
  email?: string;
  notes?: string;
  category?: string;
  is_vip?: boolean;
  is_blocked?: boolean;
  block_reason?: string;
  ai_temperament_preset?: string;
  ai_greeting_template?: string;
  ai_greeting_instructions?: string;
  ai_swearing_rule?: string;
  ai_max_call_length_seconds?: number;
  ai_custom_instructions?: string;
  clear_ai_temperament?: boolean;
  clear_ai_greeting_template?: boolean;
  clear_ai_greeting_instructions?: boolean;
  clear_ai_swearing_rule?: boolean;
  clear_ai_max_call_length?: boolean;
  clear_ai_custom_instructions?: boolean;
}

export interface ContactListResponse {
  items: ContactItem[];
  total: number;
}

export interface CategoryItem {
  slug: string;
  label: string;
  is_default: boolean;
}

export interface CategoryDefaults {
  defaults: Record<string, Record<string, unknown>>;
}

export async function listContacts(
  category?: string,
  isVip?: boolean,
  isBlocked?: boolean,
): Promise<ContactListResponse> {
  const params: Record<string, string> = {};
  if (category) params.category = category;
  if (isVip !== undefined) params.is_vip = String(isVip);
  if (isBlocked !== undefined) params.is_blocked = String(isBlocked);
  const { data } = await apiClient.get('/contacts', { params });
  return data;
}

export async function getContact(contactId: string): Promise<ContactItem> {
  const { data } = await apiClient.get(`/contacts/${contactId}`);
  return data;
}

export async function createContact(params: ContactCreateParams): Promise<ContactItem> {
  const { data } = await apiClient.post('/contacts', params);
  return data;
}

export async function updateContact(
  contactId: string,
  params: ContactUpdateParams,
): Promise<ContactItem> {
  const { data } = await apiClient.patch(`/contacts/${contactId}`, params);
  return data;
}

export async function deleteContact(contactId: string): Promise<void> {
  await apiClient.delete(`/contacts/${contactId}`);
}

export async function listCategories(): Promise<{ categories: CategoryItem[] }> {
  const { data } = await apiClient.get('/contacts/categories');
  return data;
}

export async function createCategory(slug: string, label: string): Promise<CategoryItem> {
  const { data } = await apiClient.post('/contacts/categories', { slug, label });
  return data;
}

export async function deleteCategory(slug: string): Promise<void> {
  await apiClient.delete(`/contacts/categories/${slug}`);
}

export async function getCategoryDefaults(): Promise<CategoryDefaults> {
  const { data } = await apiClient.get('/contacts/categories/defaults');
  return data;
}

export async function updateCategoryDefaults(
  defaults: Record<string, Record<string, unknown>>,
): Promise<CategoryDefaults> {
  const { data } = await apiClient.put('/contacts/categories/defaults', { defaults });
  return data;
}
