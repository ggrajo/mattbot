import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
  TextInput as RNTextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Toast } from '../components/ui/Toast';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { TextInput } from '../components/ui/TextInput';
import { Divider } from '../components/ui/Divider';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { apiClient, extractApiError } from '../api/client';
import { hapticLight } from '../utils/haptics';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AssistantSettings'>;

interface VoiceOption {
  id: string;
  provider_voice_id: string;
  display_name: string;
  locale: string;
  gender_tag: string;
  preview_url?: string;
  sort_order?: number;
}

type Temperament =
  | 'professional_polite'
  | 'casual_friendly'
  | 'short_and_direct'
  | 'warm_and_supportive'
  | 'formal'
  | 'custom';

type SwearingRule = 'no_swearing' | 'mirror_caller' | 'allow';
type GreetingTemplate = 'standard' | 'brief' | 'formal' | 'custom';

const TEMPERAMENT_OPTIONS: { value: Temperament; label: string; icon: string }[] = [
  { value: 'professional_polite', label: 'Professional', icon: 'briefcase-outline' },
  { value: 'casual_friendly', label: 'Casual', icon: 'emoticon-happy-outline' },
  { value: 'short_and_direct', label: 'Direct', icon: 'flash-outline' },
  { value: 'warm_and_supportive', label: 'Warm', icon: 'heart-outline' },
  { value: 'formal', label: 'Formal', icon: 'school-outline' },
  { value: 'custom', label: 'Custom', icon: 'tune' },
];

const SWEARING_OPTIONS: { value: SwearingRule; label: string; desc: string }[] = [
  { value: 'no_swearing', label: 'No swearing', desc: 'Always keep it clean' },
  { value: 'mirror_caller', label: 'Mirror caller', desc: 'Match the caller\'s language' },
  { value: 'allow', label: 'Allow', desc: 'No restrictions on language' },
];

const GREETING_OPTIONS: { value: GreetingTemplate; label: string; desc: string }[] = [
  { value: 'standard', label: 'Standard', desc: '"Hi, you\'ve reached [name]\'s assistant"' },
  { value: 'brief', label: 'Brief', desc: '"[Name]\'s line, how can I help?"' },
  { value: 'formal', label: 'Formal', desc: '"Good [time], thank you for calling..."' },
  { value: 'custom', label: 'Custom', desc: 'Write your own greeting' },
];

export function AssistantSettingsScreen({}: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const { settings, loading, error, loadSettings, updateSettings } = useSettingsStore();

  const [assistantName, setAssistantName] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('');
  const [temperament, setTemperament] = useState<Temperament>('professional_polite');
  const [swearingRule, setSwearingRule] = useState<SwearingRule>('no_swearing');
  const [primaryLanguage, setPrimaryLanguage] = useState('en');
  const [secondaryLanguage, setSecondaryLanguage] = useState('');
  const [greetingTemplate, setGreetingTemplate] = useState<GreetingTemplate>('standard');
  const [customInstructions, setCustomInstructions] = useState('');

  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [voicesError, setVoicesError] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [dirty, setDirty] = useState(false);

  const audioRef = useRef<any>(null);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
      loadVoices();
      loadAgent();
    }, []),
  );

  useEffect(() => {
    if (settings) {
      setAssistantName(settings.assistant_name ?? '');
      setTemperament((settings.temperament_preset as Temperament) ?? 'professional_polite');
      setSwearingRule((settings.swearing_rule as SwearingRule) ?? 'no_swearing');
      setPrimaryLanguage(settings.language_primary ?? 'en');
      setSecondaryLanguage(settings.language_secondary ?? '');
      setGreetingTemplate((settings.greeting_template as GreetingTemplate) ?? 'standard');
      // custom_instructions lives on the agent, not settings - loaded via loadAgent
    }
  }, [settings]);

  async function loadVoices() {
    setVoicesLoading(true);
    setVoicesError(null);
    try {
      const { data } = await apiClient.get('/voices');
      const list = data?.items ?? data?.voices ?? data;
      setVoices(Array.isArray(list) ? list : []);
    } catch (e) {
      setVoicesError(extractApiError(e));
    } finally {
      setVoicesLoading(false);
    }
  }

  async function loadAgent() {
    try {
      const { data } = await apiClient.get('/agents/default');
      if (data?.voice?.voice_id) setSelectedVoice(data.voice.voice_id);
      else if (data?.voice_id) setSelectedVoice(data.voice_id);
      if (data?.user_instructions) setCustomInstructions(data.user_instructions);
    } catch {}
  }

  function handlePlayPreview(voice: VoiceOption) {
    hapticLight();
    if (playingVoiceId === voice.id) {
      setPlayingVoiceId(null);
      return;
    }
    setPlayingVoiceId(voice.id);
    setTimeout(() => setPlayingVoiceId(null), 3000);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const ok = await updateSettings({
        assistant_name: assistantName.trim() || undefined,
        temperament_preset: temperament,
        swearing_rule: swearingRule,
        language_primary: primaryLanguage,
        language_secondary: secondaryLanguage || undefined,
        greeting_template: greetingTemplate,
      });

      const agentPatch: Record<string, unknown> = {};
      if (selectedVoice) agentPatch.voice_id = selectedVoice;
      agentPatch.user_instructions = customInstructions.trim() || null;
      await apiClient.patch('/agents/default', agentPatch);

      if (ok) {
        setDirty(false);
        setToastType('success');
        setToast('Assistant settings saved');
      } else {
        setToastType('error');
        setToast(useSettingsStore.getState().error ?? 'Failed to save settings');
      }
    } catch (e) {
      setToastType('error');
      setToast(extractApiError(e));
    } finally {
      setSaving(false);
    }
  }

  function markDirty() {
    if (!dirty) setDirty(true);
  }

  return (
    <ScreenWrapper>
      <Toast message={toast} type={toastType} visible={!!toast} onDismiss={() => setToast('')} />

      <Text
        style={{ ...typography.h2, color: colors.textPrimary, marginBottom: spacing.sm }}
        allowFontScaling
      >
        AI Assistant
      </Text>
      <Text
        style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl }}
        allowFontScaling
      >
        Configure your assistant's personality, voice, and behavior.
      </Text>

      {error && (
        <View style={{ marginBottom: spacing.lg }}>
          <ErrorMessage message={error} action="Retry" onAction={loadSettings} />
        </View>
      )}

      {/* Agent Name */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="robot-outline" size="md" color={colors.primary} />
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              Assistant Name
            </Text>
          </View>
          <TextInput
            label="Name"
            placeholder="e.g. MattBot"
            value={assistantName}
            onChangeText={(t) => { setAssistantName(t); markDirty(); }}
            autoCapitalize="words"
          />
        </View>
      </Card>

      {/* Voice Selection */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="account-voice" size="md" color={colors.accent} />
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              Voice
            </Text>
          </View>
          <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
            Choose how your assistant sounds to callers.
          </Text>

          {voicesLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : voicesError ? (
            <ErrorMessage message={voicesError} action="Retry" onAction={loadVoices} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}
            >
              {voices.map((voice) => {
                const selected = selectedVoice === voice.id;
                const playing = playingVoiceId === voice.id;
                return (
                  <TouchableOpacity
                    key={voice.id}
                    onPress={() => {
                      hapticLight();
                      setSelectedVoice(voice.id);
                      markDirty();
                    }}
                    activeOpacity={0.7}
                    style={{
                      width: 120,
                      padding: spacing.md,
                      borderRadius: radii.md,
                      borderWidth: 1.5,
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary + '14' : colors.surface,
                      alignItems: 'center',
                      gap: spacing.sm,
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${voice.display_name} voice`}
                  >
                    <Icon
                      name={voice.gender_tag === 'female' ? 'face-woman' : 'face-man'}
                      size="lg"
                      color={selected ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={{
                        ...typography.bodySmall,
                        color: selected ? colors.primary : colors.textPrimary,
                        fontWeight: selected ? '600' : '400',
                        textAlign: 'center',
                      }}
                      numberOfLines={1}
                      allowFontScaling
                    >
                      {voice.display_name}
                    </Text>
                    <Text
                      style={{ ...typography.caption, color: colors.textSecondary, textAlign: 'center' }}
                      numberOfLines={1}
                      allowFontScaling
                    >
                      {voice.locale}
                    </Text>
                    {voice.preview_url && (
                      <TouchableOpacity
                        onPress={() => handlePlayPreview(voice)}
                        hitSlop={8}
                        accessibilityLabel={playing ? 'Stop preview' : 'Play preview'}
                      >
                        <Icon
                          name={playing ? 'stop-circle-outline' : 'play-circle-outline'}
                          size="md"
                          color={colors.primary}
                        />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Card>

      <Divider style={{ marginBottom: spacing.lg }} />

      {/* Temperament */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="emoticon-outline" size="md" color={colors.secondary} />
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              Temperament
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {TEMPERAMENT_OPTIONS.map((opt) => {
              const selected = temperament === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => { hapticLight(); setTemperament(opt.value); markDirty(); }}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.xs,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    borderRadius: radii.full,
                    borderWidth: 1.5,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primary + '14' : 'transparent',
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${opt.label} temperament`}
                >
                  <Icon
                    name={opt.icon}
                    size="sm"
                    color={selected ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={{
                      ...typography.bodySmall,
                      color: selected ? colors.primary : colors.textPrimary,
                      fontWeight: selected ? '600' : '400',
                    }}
                    allowFontScaling
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Card>

      {/* Swearing Rule */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="message-alert-outline" size="md" color={colors.warning} />
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              Language Rules
            </Text>
          </View>
          {SWEARING_OPTIONS.map((opt) => {
            const selected = swearingRule === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => { hapticLight(); setSwearingRule(opt.value); markDirty(); }}
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

      <Divider style={{ marginBottom: spacing.lg }} />

      {/* Language */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="translate" size="md" color={colors.primary} />
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              Language
            </Text>
          </View>
          <TextInput
            label="Primary Language"
            placeholder="e.g. en"
            value={primaryLanguage}
            onChangeText={(t) => { setPrimaryLanguage(t); markDirty(); }}
            autoCapitalize="none"
          />
          <TextInput
            label="Secondary Language (optional)"
            placeholder="e.g. es"
            value={secondaryLanguage}
            onChangeText={(t) => { setSecondaryLanguage(t); markDirty(); }}
            autoCapitalize="none"
          />
        </View>
      </Card>

      {/* Greeting Template */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="hand-wave-outline" size="md" color={colors.accent} />
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              Greeting
            </Text>
          </View>
          {GREETING_OPTIONS.map((opt) => {
            const selected = greetingTemplate === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => { hapticLight(); setGreetingTemplate(opt.value); markDirty(); }}
                activeOpacity={0.7}
                style={{
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.md,
                  borderRadius: radii.md,
                  borderWidth: 1.5,
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primary + '14' : 'transparent',
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${opt.label} greeting`}
              >
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
                <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs }} allowFontScaling>
                  {opt.desc}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* Custom Instructions */}
      <Card variant="elevated" style={{ marginBottom: spacing.xl }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="text-box-outline" size="md" color={colors.secondary} />
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              Custom Instructions
            </Text>
          </View>
          <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
            Provide additional instructions for your assistant. These are appended to the system prompt.
          </Text>
          <View
            style={{
              borderWidth: 1.5,
              borderColor: colors.border,
              borderRadius: radii.md,
              backgroundColor: colors.surface,
              padding: spacing.md,
            }}
          >
            <RNTextInput
              value={customInstructions}
              onChangeText={(t) => { setCustomInstructions(t); markDirty(); }}
              placeholder="e.g. Always ask for a callback number. Never schedule meetings on Fridays."
              placeholderTextColor={colors.textDisabled}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{
                ...typography.body,
                color: colors.textPrimary,
                minHeight: 100,
              }}
              accessibilityLabel="Custom instructions"
            />
          </View>
          <Text style={{ ...typography.caption, color: colors.textDisabled }} allowFontScaling>
            {customInstructions.length} / 2000 characters
          </Text>
        </View>
      </Card>

      <Button
        title="Save Settings"
        icon="content-save-outline"
        onPress={handleSave}
        loading={saving}
        disabled={!dirty || saving}
      />
    </ScreenWrapper>
  );
}
