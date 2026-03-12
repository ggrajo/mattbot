# Extracted Mobile Code from Conversation bfd388f8 (Mar 3, 2026)

## Extraction Summary

- **Source**: bfd388f8-758c-4b42-9a7d-f5074e0a2bc0 (parent + 68 subagents)
- **Total mobile code reference blocks found**: 14 unique blocks
- **Total unique mobile files with code**: 12
- **Full files recovered**: 7
- **Partial snippets recovered**: 7
- **Comprehensive audit (no code, but full inventory)**: subagent 319396c1

> **IMPORTANT**: Cursor agent transcripts only store assistant text messages, NOT Read/Write tool call
> results. The code below comes from code reference blocks the assistant included in its text
> responses. Some files were read but not quoted back in the response — those are unrecoverable
> from the transcript.

---

## File Index

| # | File | Coverage | Lines | Source Subagent |
|---|------|----------|-------|-----------------|
| 1 | `mobile/src/api/billing.ts` | FULL (truncated at end) | 1-111 | dfe27558 |
| 2 | `mobile/src/api/blocks.ts` | **FULL** | 1-38 | 4983427b |
| 3 | `mobile/src/api/calls.ts` | FULL (truncated at end) | 1-146 | b849893b |
| 4 | `mobile/src/api/vip.ts` | **FULL** | 1-36 | 4983427b |
| 5 | `mobile/src/navigation/types.ts` | PARTIAL | 22-38 | dfe27558 |
| 6 | `mobile/src/screens/CallDetailScreen.tsx` | FULL (imports only, then truncated) | 1-576 | b849893b |
| 7 | `mobile/src/screens/CallDetailScreen.tsx` | PARTIAL (handleSaveNote) | 215-228 | 05b629a7 |
| 8 | `mobile/src/screens/CallsListScreen.tsx` | PARTIAL (statusBadge) | 38-54 | 7c164237 |
| 9 | `mobile/src/screens/CallsListScreen.tsx` | PARTIAL (callSubtitle) | 57-62 | 7c164237 |
| 10 | `mobile/src/screens/HandoffSettingsScreen.tsx` | **FULL** | 1-245 | b3750efa |
| 11 | `mobile/src/screens/HomeScreen.tsx` | PARTIAL (MFA card) | 377-387 | 19ae6949 |
| 12 | `mobile/src/store/billingStore.ts` | PARTIAL (interface) | 15-98 | dfe27558 |
| 13 | `mobile/src/store/blockStore.ts` | **FULL** | 1-62 | 4983427b |
| 14 | `mobile/src/store/vipStore.ts` | **FULL** | 1-62 | 4983427b |

---

# FULL FILE EXTRACTIONS

---

## 1. `mobile/src/api/blocks.ts` — FULL FILE (38 lines)
**Source**: subagent 4983427b, line 2

```typescript
import { apiClient } from './client';

export interface BlockEntry {
  id: string;
  phone_last4: string;
  display_name: string | null;
  reason: string | null;
  company: string | null;
  relationship: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export interface AddBlockParams {
  phone_number: string;
  display_name?: string;
  reason?: string;
  company?: string;
  relationship?: string;
  email?: string;
  notes?: string;
}

export async function listBlocks(): Promise<{ items: BlockEntry[] }> {
  const { data } = await apiClient.get('/blocks');
  return data;
}

export async function addBlock(params: AddBlockParams): Promise<BlockEntry> {
  const { data } = await apiClient.post('/blocks', params);
  return data;
}

export async function removeBlock(blockId: string): Promise<void> {
  await apiClient.delete(`/blocks/${blockId}`);
}
```

---

## 2. `mobile/src/api/vip.ts` — FULL FILE (36 lines)
**Source**: subagent 4983427b, line 2

```typescript
import { apiClient } from './client';

export interface VipEntry {
  id: string;
  phone_last4: string;
  display_name: string | null;
  company: string | null;
  relationship: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export interface AddVipParams {
  phone_number: string;
  display_name?: string;
  company?: string;
  relationship?: string;
  email?: string;
  notes?: string;
}

export async function listVip(): Promise<{ items: VipEntry[] }> {
  const { data } = await apiClient.get('/vip');
  return data;
}

export async function addVip(params: AddVipParams): Promise<VipEntry> {
  const { data } = await apiClient.post('/vip', params);
  return data;
}

export async function removeVip(vipId: string): Promise<void> {
  await apiClient.delete(`/vip/${vipId}`);
}
```

---

## 3. `mobile/src/api/calls.ts` — FULL FILE (146 lines, truncated at end)
**Source**: subagent b849893b, line 2

```typescript
import { apiClient } from './client';

export interface CallEvent {
  id: string;
  event_type: string;
  provider_status: string | null;
  event_at: string;
}

export interface CallLabel {
  label_name: string;
  reason_text: string;
  evidence_snippets: string[];
  confidence: number;
  produced_by: string;
}

export interface CallListItem {
  id: string;
  created_at: string;
  direction: string;
  from_masked: string;
  to_masked: string;
  status: string;
  duration_seconds: number | null;
  source_type: string;
  missing_summary: boolean;
  missing_transcript: boolean;
  missing_labels: boolean;
  started_at: string;
  artifact_status: string | null;
}

export interface CallListResponse {
  items: CallListItem[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface CallDetail {
  id: string;
  direction: string;
  source_type: string;
  from_masked: string;
  to_masked: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  forwarding_detected: boolean;
  missing_summary: boolean;
  missing_transcript: boolean;
  missing_labels: boolean;
  events: CallEvent[];
  created_at: string;
  summary: string | null;
  summary_status: string | null;
  labels: CallLabel[] | null;
  labels_status: string | null;
  transcript_status: string | null;
}

export interface CallArtifacts {
  call_id: string;
  summary: string | null;
  summary_status: string;
  labels: CallLabel[];
  labels_status: string;
  transcript_status: string;
  structured_extraction: Record<string, unknown> | null;
}

export interface TranscriptTurn {
  role: string;
  text: string;
  time_seconds: number;
}

export interface TranscriptResponse {
  call_id: string;
  conversation_id: string | null;
  turns: TranscriptTurn[];
  turn_count: number;
  status: string;
}

// ... MemoryItem, CallFilters ...

export async function fetchCalls(cursor?: string, filters?: CallFilters): Promise<CallListResponse> {
  const params: Record<string, string> = {};
  if (cursor) params.cursor = cursor;
  if (filters?.label) params.label = filters.label;
  if (filters?.search) params.search = filters.search;
  if (filters?.status) params.status = filters.status;
  const { data } = await apiClient.get('/calls', { params });
  return data;
}

export async function fetchCallDetail(callId: string): Promise<CallDetail> {
  const { data } = await apiClient.get(`/calls/${callId}`);
  return data;
}

export async function fetchCallArtifacts(callId: string): Promise<CallArtifacts> {
  const { data } = await apiClient.get(`/calls/${callId}/artifacts`);
  return data;
}

export async function fetchCallTranscript(callId: string): Promise<TranscriptResponse> {
  const { data } = await apiClient.get(`/calls/${callId}/transcript`);
  return data;
}

export async function retryCallTranscript(callId: string): Promise<{ status: string; message: string }> {
  const { data } = await apiClient.post(`/calls/${callId}/transcript/retry`);
  return data;
}
// ... fetchMemoryItems, deleteMemoryItem, deleteAllMemory
```

---

## 4. `mobile/src/api/billing.ts` — FULL FILE (111 lines, truncated at end)
**Source**: subagent dfe27558, line 3

```typescript
import { apiClient } from './client';

export interface BillingPlan {
  code: string;
  name: string;
  price_usd: string;
  included_minutes: number;
  requires_credit_card: boolean;
  limited: boolean;
  sort_order: number;
  description: string;
  icon: string;
}

export interface PaymentMethodInfo {
  brand: string | null;
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
}

export interface BillingStatus {
  plan: string | null;
  status: string | null;
  minutes_included: number;
  minutes_used: number;
  minutes_remaining: number;
  minutes_carried_over?: number;
  payment_method: PaymentMethodInfo | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  has_subscription: boolean;
  auto_upgrade_enabled?: boolean;
  auto_upgrade_plan?: string | null;
}
// ... getPlans, getBillingStatus, createSetupIntent, subscribe, changePlan, cancelSubscription
// ... devSetPlan, devSimulateUsage
```

---

## 5. `mobile/src/store/vipStore.ts` — FULL FILE (62 lines)
**Source**: subagent 4983427b, line 2

```typescript
import { create } from 'zustand';
import {
  type VipEntry,
  type AddVipParams,
  listVip as apiListVip,
  addVip as apiAddVip,
  removeVip as apiRemoveVip,
} from '../api/vip';
import { extractApiError } from '../api/client';

interface VipStore {
  items: VipEntry[];
  loading: boolean;
  error: string | null;

  loadVip: () => Promise<void>;
  addVip: (params: AddVipParams) => Promise<boolean>;
  removeVip: (vipId: string) => Promise<boolean>;
  reset: () => void;
}

export const useVipStore = create<VipStore>((set) => ({
  items: [],
  loading: false,
  error: null,

  loadVip: async () => {
    set({ loading: true, error: null });
    try {
      const result = await apiListVip();
      set({ items: result.items, loading: false });
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
    }
  },

  addVip: async (params) => {
    set({ error: null });
    try {
      const entry = await apiAddVip(params);
      set((state) => ({ items: [entry, ...state.items] }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  removeVip: async (vipId) => {
    set({ error: null });
    try {
      await apiRemoveVip(vipId);
      set((state) => ({ items: state.items.filter((i) => i.id !== vipId) }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  reset: () => set({ items: [], loading: false, error: null }),
}));
```

---

## 6. `mobile/src/store/blockStore.ts` — FULL FILE (62 lines)
**Source**: subagent 4983427b, line 2

```typescript
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
```

---

## 7. `mobile/src/screens/HandoffSettingsScreen.tsx` — FULL FILE (245 lines)
**Source**: subagent b3750efa, line 8

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, Switch, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Toast } from '../components/ui/Toast';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'HandoffSettings'>;

type HandoffTrigger = 'vip_only' | 'urgent_only' | 'vip_and_urgent';

const TRIGGER_OPTIONS: { value: HandoffTrigger; label: string; desc: string; icon: string }[] = [
  { value: 'vip_only', label: 'VIP only', desc: 'Offer handoff only for VIP callers', icon: 'star-outline' },
  { value: 'urgent_only', label: 'Urgent only', desc: 'Offer handoff only when the call is flagged urgent', icon: 'alert-circle-outline' },
  { value: 'vip_and_urgent', label: 'VIP and Urgent', desc: 'Offer handoff for VIP callers or urgent calls', icon: 'shield-star-outline' },
];

export function HandoffSettingsScreen({}: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const { settings, loading, error, loadSettings, updateSettings } = useSettingsStore();

  const [enabled, setEnabled] = useState(false);
  const [trigger, setTrigger] = useState<HandoffTrigger>('vip_only');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.handoff_enabled);
      if (settings.handoff_trigger) setTrigger(settings.handoff_trigger);
    }
  }, [settings]);

  async function handleSave() {
    setSaving(true);
    const ok = await updateSettings({
      handoff_enabled: enabled,
      handoff_trigger: trigger,
    });
    if (ok) {
      setToastType('success');
      setToast('Handoff settings saved');
    } else {
      setToastType('error');
      setToast(useSettingsStore.getState().error ?? 'Failed to save handoff settings.');
    }
    setSaving(false);
  }

  if (!settings && loading) {
    return (
      <ScreenWrapper scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Toast message={toast} type={toastType} visible={!!toast} onDismiss={() => setToast('')} />

      {error && <ErrorMessage message={error} action="Retry" onAction={loadSettings} />}

      {/* Master toggle */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="phone-forward-outline" size="md" color={colors.primary} />
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              Live Handoff
            </Text>
          </View>
          <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
            When enabled, your assistant can offer to transfer important calls to you in real time.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ ...typography.body, color: colors.textPrimary }} allowFontScaling>
              Enable live handoff
            </Text>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              accessibilityLabel="Enable live handoff"
            />
          </View>
        </View>
      </Card>

      {enabled && (
        <>
          {/* Trigger rule */}
          <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Icon name="filter-outline" size="md" color={colors.accent} />
                <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
                  Trigger Rule
                </Text>
              </View>
              <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
                When should a handoff be offered?
              </Text>

              {TRIGGER_OPTIONS.map((opt) => {
                const selected = trigger === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setTrigger(opt.value)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                      paddingVertical: spacing.md,
                      paddingHorizontal: spacing.md,
                      borderRadius: radii.md,
                      borderWidth: 1.5,
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary + '14' : 'transparent',
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={opt.label}
                  >
                    <Icon
                      name={opt.icon}
                      size="md"
                      color={selected ? colors.primary : colors.textSecondary}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          ...typography.body,
                          color: colors.textPrimary,
                          fontWeight: selected ? '600' : '400',
                        }}
                        allowFontScaling
                      >
                        {opt.label}
                      </Text>
                      <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                        {opt.desc}
                      </Text>
                    </View>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: selected ? colors.primary : colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {selected && (
                        <View
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            backgroundColor: colors.primary,
                          }}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* Timeout info */}
          <Card
            variant="flat"
            style={{
              marginBottom: spacing.lg,
              backgroundColor: colors.primaryContainer,
              borderColor: colors.primary,
              borderWidth: 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon name="timer-outline" size="md" color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{ ...typography.body, color: colors.primary, fontWeight: '500' }}
                  allowFontScaling
                >
                  Handoff Timeout
                </Text>
                <Text style={{ ...typography.caption, color: colors.primary }} allowFontScaling>
                  You have 20 seconds to accept a handoff before the assistant continues the call.
                </Text>
              </View>
            </View>
          </Card>

          {/* Privacy mode interaction */}
          <Card variant="flat" style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
              <Icon name="shield-lock-outline" size="md" color={colors.secondary} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{ ...typography.body, color: colors.textPrimary, fontWeight: '500' }}
                  allowFontScaling
                >
                  Privacy Mode
                </Text>
                <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs }} allowFontScaling>
                  When notification privacy is set to "Private", the handoff banner will only show "Call takeover available" without caller details. Switch to "Preview" mode in Privacy settings to see caller name and reason.
                </Text>
              </View>
            </View>
          </Card>
        </>
      )}

      <Button
        title="Save"
        icon="content-save-outline"
        onPress={handleSave}
        loading={saving}
        disabled={saving}
      />
    </ScreenWrapper>
  );
}
```

---

# PARTIAL FILE EXTRACTIONS

---

## 8. `mobile/src/screens/CallDetailScreen.tsx` — IMPORTS ONLY (576 line file)
**Source**: subagent b849893b, line 2
**Note**: The assistant cited the full file (lines 1-576) but only included the imports before truncating with "// ... (full file 576 lines - see above read_file output)"

```typescript
import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl, Modal, Pressable, TextInput as RNTextInput } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Button } from '../components/ui/Button';
import { FadeIn } from '../components/ui/FadeIn';
import { ConfirmSheet } from '../components/ui/ConfirmSheet';
import { Toast } from '../components/ui/Toast';
import { useTheme } from '../theme/ThemeProvider';
import { useCallStore } from '../store/callStore';
import { useVipStore } from '../store/vipStore';
import { useBlockStore } from '../store/blockStore';
import type { CallEvent, CallLabel, TranscriptTurn } from '../api/calls';
```

### handleSaveNote function (lines 215-228)
**Source**: subagent 05b629a7, line 3

```typescript
  const handleSaveNote = useCallback(async () => {
    if (!noteText.trim()) return;
    setNoteModalVisible(false);
    setActionLoading('note');
    try {
      await patchCall(callId, { notes: noteText.trim() });
      setToast('Note saved');
      setNoteText('');
    } catch (e: unknown) {
      const msg = extractApiError(e);
      if (msg) setToast(msg);
    }
    setActionLoading(null);
  }, [noteText, callId]);
```

---

## 9. `mobile/src/screens/CallsListScreen.tsx` — PARTIAL SNIPPETS
**Source**: subagent 7c164237, line 7

### statusBadge function (lines 38-54)

```typescript
function statusBadge(status: string): StatusBadge {
  switch (status) {
    case 'completed':
      return { label: 'Completed', variant: 'success' };
    // ...
    case 'twiml_responded':
      return { label: 'Answered', variant: 'info' };
    // ...
  }
}
```

### callSubtitle function (lines 57-62)

```typescript
function callSubtitle(item: CallListItem): string {
  if (item.status === 'completed') return 'Call ended';
  // ...
  return 'Call captured';
}
```

---

## 10. `mobile/src/navigation/types.ts` — PARTIAL (lines 22-38)
**Source**: subagent dfe27558, line 3

```typescript
  SubscriptionGate: undefined;
  // ...
  PlanSelection: { source?: 'onboarding' | 'manage' } | undefined;
  PaymentMethod: { plan: string; source?: 'onboarding' | 'manage' };
  SubscriptionStatus: undefined;
  ManageSubscription: undefined;
```

---

## 11. `mobile/src/screens/HomeScreen.tsx` — PARTIAL (lines 377-387)
**Source**: subagent 19ae6949, line 4

```typescript
                    Account Secured
                  </Text>
                  <Text
                    style={{ ...typography.caption, color: colors.textSecondary }}
                    allowFontScaling
                  >
                    Two-factor authentication active
                  </Text>
                </View>
                <Badge label="MFA" variant="success" />
```

---

## 12. `mobile/src/store/billingStore.ts` — PARTIAL (lines 15-98)
**Source**: subagent dfe27558, line 3

```typescript
interface BillingStore {
  plans: BillingPlan[];
  plansLoaded: boolean;
  billingStatus: BillingStatus | null;
  loading: boolean;
  error: string | null;

  loadPlans: () => Promise<void>;
  loadBillingStatus: () => Promise<void>;
  subscribe: (plan: string, paymentMethodId: string) => Promise<SubscriptionResult | null>;
  changePlan: (newPlan: string) => Promise<SubscriptionResult | null>;
  cancel: () => Promise<boolean>;
  reset: () => void;
}
// ... implementations
```

---

# ADDITIONAL CODE SNIPPETS FROM INLINE CONTENT

## `mobile/src/screens/TemperamentScreen.tsx` — Language inputs (from subagent 6088bcd1 audit)

Lines 236-249:
```tsx
<TextInput
  placeholder="Primary language (e.g. en, es, fr)"
  value={langPrimary}
  onChangeText={setLangPrimary}
  autoCapitalize="none"
  maxLength={10}
/>
<TextInput
  placeholder="Secondary language (optional)"
  value={langSecondary}
  onChangeText={setLangSecondary}
  autoCapitalize="none"
  maxLength={10}
/>
```

---

# COMPREHENSIVE MOBILE INVENTORY (from subagent 319396c1 audit)

This subagent did a complete read of every mobile file and returned a structured inventory
(no actual code, but complete metadata). Key facts:

## Screens (30 files in mobile/src/screens/)

**Auth Flow (7)**: WelcomeScreen, RegisterScreen, LoginScreen, ForgotPasswordScreen, PasswordResetConfirmScreen, EmailVerificationScreen, MfaEnrollScreen, MfaVerifyScreen, RecoveryCodesScreen

**Onboarding (3)**: OnboardingPrivacyScreen, OnboardingSettingsScreen, OnboardingAssistantSetupScreen

**Billing (5)**: PlanSelectionScreen, PaymentMethodScreen, SubscriptionStatusScreen, ManageSubscriptionScreen, SubscriptionGateScreen

**Main App (4)**: HomeScreen, CallsListScreen, CallDetailScreen, SettingsScreen

**Settings Sub-Screens (6)**: AccountSettingsScreen, ProfileSettingsScreen, AssistantSettingsScreen, PrivacySettingsScreen, QuietHoursScreen, MemorySettingsScreen

**Telephony (4)**: NumberProvisionScreen, CallModesScreen, ForwardingSetupGuideScreen, ForwardingVerifyScreen

**Device (1)**: DeviceListScreen

**NEW SCREENS (added during this conversation)**: VipListScreen, BlockListScreen, RemindersListScreen, CreateReminderScreen, TextBackScreen, MemoryListScreen, BusinessHoursScreen, TemperamentScreen, HandoffSettingsScreen

## API Layer (8 files in mobile/src/api/)

- `client.ts` — Axios instance, interceptors, token refresh, error extraction
- `auth.ts` — 16 functions (register, login, OAuth, MFA, token refresh, etc.)
- `billing.ts` — 7 functions (plans, status, subscribe, change, cancel)
- `calls.ts` — 7 functions (list, detail, artifacts, transcript, memory)
- `devices.ts` — 4 functions (list, revoke, remember, register)
- `push.ts` — 1 function (register push token)
- `settings.ts` — 2 functions (get, patch with revision)
- `telephony.ts` — 7 functions (provision, list numbers, call modes, forwarding)
- `agents.ts` — 5 functions (fetch, create default, update, voices, suggestions)
- `onboarding.ts` — 2 functions (get, complete step)

**NEW API files (added during this conversation)**: vip.ts, blocks.ts, reminders.ts, messages.ts, handoff.ts, websocket.ts

## Stores (6+ in mobile/src/store/)

- `authStore.ts` — Auth state machine (loading/unauthenticated/mfa_required/authenticated)
- `settingsStore.ts` — Settings with revision-based optimistic concurrency
- `billingStore.ts` — Plans, billing status, subscription operations
- `callStore.ts` — Calls list with cursor pagination, detail, artifacts, transcript
- `deviceStore.ts` — Device list
- `telephonyStore.ts` — Numbers, call modes, forwarding verification
- `agentStore.ts` — Agent config with revision conflict handling

**NEW stores (added during this conversation)**: vipStore.ts, blockStore.ts, reminderStore.ts, messageStore.ts, realtimeStore.ts

## Components (21 files)

**UI (17)**: Button, TextInput, OtpInput, Card, Badge, Icon, IconButton, ListRow, Divider, Toast, ConfirmSheet, ErrorMessage, StatusScreen, LoadingOverlay, FadeIn, ScreenWrapper, SkeletonLoader, BiometricGate, TimePicker

**Auth (3)**: SocialLoginButtons, TotpQrCode, RecoveryCodeList

**Onboarding (1)**: OnboardingProgress

**NEW components**: HandoffBanner, PhoneInput, ContactPicker

## Hooks (2)

- `useBiometric.ts` — Biometric availability + authenticate()
- `useSocialAuth.ts` — Google/Apple sign-in

## Navigation

- `types.ts` — TabParamList (4 tabs) + RootStackParamList (39+ routes)
- `RootNavigator.tsx` — Deep linking, BiometricGate, auto-loads settings/billing/profile
- `TabNavigator.tsx` — 4 tabs: Home, Calls, Settings, Account

---

# FILES NOT RECOVERABLE FROM TRANSCRIPT

The following files were READ during the conversation but their contents were not quoted back
in assistant messages (only tool call results, which are not stored in transcripts):

- `mobile/src/api/client.ts`
- `mobile/src/api/auth.ts`
- `mobile/src/api/settings.ts`
- `mobile/src/api/telephony.ts`
- `mobile/src/api/agents.ts`
- `mobile/src/api/devices.ts`
- `mobile/src/api/push.ts`
- `mobile/src/api/onboarding.ts`
- `mobile/src/store/authStore.ts`
- `mobile/src/store/settingsStore.ts`
- `mobile/src/store/callStore.ts`
- `mobile/src/store/deviceStore.ts`
- `mobile/src/store/telephonyStore.ts`
- `mobile/src/store/agentStore.ts`
- `mobile/src/screens/WelcomeScreen.tsx`
- `mobile/src/screens/RegisterScreen.tsx`
- `mobile/src/screens/LoginScreen.tsx`
- `mobile/src/screens/SettingsScreen.tsx`
- `mobile/src/screens/AccountSettingsScreen.tsx`
- `mobile/src/screens/ProfileSettingsScreen.tsx`
- `mobile/src/screens/AssistantSettingsScreen.tsx`
- `mobile/src/screens/PrivacySettingsScreen.tsx`
- `mobile/src/screens/QuietHoursScreen.tsx`
- `mobile/src/screens/MemorySettingsScreen.tsx`
- `mobile/src/screens/NumberProvisionScreen.tsx`
- `mobile/src/screens/CallModesScreen.tsx`
- `mobile/src/screens/ForwardingSetupGuideScreen.tsx`
- `mobile/src/screens/ForwardingVerifyScreen.tsx`
- `mobile/src/screens/DeviceListScreen.tsx`
- `mobile/src/screens/PlanSelectionScreen.tsx`
- `mobile/src/screens/PaymentMethodScreen.tsx`
- `mobile/src/screens/SubscriptionStatusScreen.tsx`
- `mobile/src/screens/ManageSubscriptionScreen.tsx`
- `mobile/src/screens/SubscriptionGateScreen.tsx`
- `mobile/src/screens/OnboardingPrivacyScreen.tsx`
- `mobile/src/screens/OnboardingSettingsScreen.tsx`
- `mobile/src/screens/OnboardingAssistantSetupScreen.tsx`
- `mobile/src/screens/VipListScreen.tsx`
- `mobile/src/screens/BlockListScreen.tsx`
- `mobile/src/screens/RemindersListScreen.tsx`
- `mobile/src/screens/CreateReminderScreen.tsx`
- `mobile/src/screens/TextBackScreen.tsx`
- `mobile/src/screens/MemoryListScreen.tsx`
- `mobile/src/screens/BusinessHoursScreen.tsx`
- `mobile/src/screens/TemperamentScreen.tsx`
- `mobile/src/navigation/RootNavigator.tsx`
- `mobile/src/navigation/TabNavigator.tsx`
- All component files in `mobile/src/components/`
- All hook files in `mobile/src/hooks/`
- `mobile/src/theme/ThemeProvider.tsx`
- `mobile/src/utils/formatDate.ts`
