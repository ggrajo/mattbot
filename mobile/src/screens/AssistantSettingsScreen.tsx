import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Video from 'react-native-video';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';

interface Voice {
  id: string;
  display_name: string;
  gender_tag?: string | null;
  preview_url?: string | null;
}

const TEMPERAMENTS = [
  { value: 'professional_polite', label: 'Professional', icon: 'briefcase-outline' },
  { value: 'casual_friendly', label: 'Friendly', icon: 'emoticon-happy-outline' },
  { value: 'short_and_direct', label: 'Direct', icon: 'lightning-bolt-outline' },
  { value: 'warm_and_supportive', label: 'Supportive', icon: 'heart-outline' },
  { value: 'formal', label: 'Formal', icon: 'school-outline' },
];

const SWEARING_RULES = [
  { value: 'no_swearing', label: 'No swearing', icon: 'shield-check-outline' },
  { value: 'mirror_caller', label: 'Mirror caller', icon: 'swap-horizontal' },
  { value: 'allow', label: 'Allow', icon: 'alert-circle-outline' },
];

export function AssistantSettingsScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const insets = useSafeAreaInsets();

  const [agentId, setAgentId] = useState('');
  const [agentRevision, setAgentRevision] = useState(1);
  const [settingsRevision, setSettingsRevision] = useState(1);

  const [assistantName, setAssistantName] = useState('');
  const [greetingInstructions, setGreetingInstructions] = useState('');
  const [userInstructions, setUserInstructions] = useState('');
  const [temperament, setTemperament] = useState('professional_polite');
  const [swearingRule, setSwearingRule] = useState('no_swearing');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);

  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [origSettings, setOrigSettings] = useState({ assistantName: '', temperament: '', swearingRule: '' });
  const [origAgent, setOrigAgent] = useState({ greetingInstructions: '', userInstructions: '', voiceId: '' as string | null });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError('');

      Promise.all([
        apiClient.get('/settings'),
        apiClient.get('/agents'),
        apiClient.get('/voices'),
      ])
        .then(([settingsRes, agentsRes, voicesRes]) => {
          if (!active) return;

          const s = settingsRes.data;
          setSettingsRevision(s.revision ?? 1);
          setAssistantName(s.assistant_name ?? '');
          setTemperament(s.temperament_preset ?? 'professional_polite');
          setSwearingRule(s.swearing_rule ?? 'no_swearing');
          setOrigSettings({
            assistantName: s.assistant_name ?? '',
            temperament: s.temperament_preset ?? 'professional_polite',
            swearingRule: s.swearing_rule ?? 'no_swearing',
          });

          const agents = agentsRes.data.items ?? agentsRes.data;
          const agent = Array.isArray(agents) && agents.length > 0 ? agents[0] : null;
          if (agent) {
            setAgentId(agent.id);
            setAgentRevision(agent.revision ?? 1);
            setGreetingInstructions(agent.greeting_instructions ?? '');
            setUserInstructions(agent.user_instructions ?? '');
            setSelectedVoiceId(agent.voice?.voice_id ?? null);
            setOrigAgent({
              greetingInstructions: agent.greeting_instructions ?? '',
              userInstructions: agent.user_instructions ?? '',
              voiceId: agent.voice?.voice_id ?? null,
            });
          }

          const v = voicesRes.data.items ?? voicesRes.data;
          if (Array.isArray(v)) setVoices(v);
        })
        .catch((err) => { if (active) setError(extractApiError(err)); })
        .finally(() => { if (active) setLoading(false); });

      return () => { active = false; };
    }, []),
  );

  const settingsChanged =
    assistantName !== origSettings.assistantName ||
    temperament !== origSettings.temperament ||
    swearingRule !== origSettings.swearingRule;

  const agentChanged =
    greetingInstructions !== origAgent.greetingInstructions ||
    userInstructions !== origAgent.userInstructions ||
    selectedVoiceId !== origAgent.voiceId;

  const hasChanges = settingsChanged || agentChanged;
  const selectedVoice = voices.find(v => v.id === selectedVoiceId);

  function togglePreview(voice: Voice) {
    if (playingVoiceId === voice.id) {
      setPlayingVoiceId(null);
      setPreviewUrl(null);
    } else if (voice.preview_url) {
      setPlayingVoiceId(voice.id);
      setPreviewUrl(voice.preview_url);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      if (settingsChanged) {
        const changes: Record<string, string> = {};
        if (assistantName !== origSettings.assistantName) changes.assistant_name = assistantName;
        if (temperament !== origSettings.temperament) changes.temperament_preset = temperament;
        if (swearingRule !== origSettings.swearingRule) changes.swearing_rule = swearingRule;

        const res = await apiClient.patch('/settings', {
          expected_revision: settingsRevision,
          changes,
        });
        setSettingsRevision(res.data.revision);
        setOrigSettings({ assistantName, temperament, swearingRule });
      }

      if (agentChanged && agentId) {
        const agentPatch: Record<string, unknown> = { expected_revision: agentRevision };
        if (greetingInstructions !== origAgent.greetingInstructions) agentPatch.greeting_instructions = greetingInstructions;
        if (userInstructions !== origAgent.userInstructions) agentPatch.user_instructions = userInstructions;
        if (selectedVoiceId !== origAgent.voiceId) agentPatch.voice_id = selectedVoiceId || '';

        const res = await apiClient.patch(`/agents/${agentId}`, agentPatch);
        setAgentRevision(res.data.revision ?? agentRevision);
        setOrigAgent({ greetingInstructions, userInstructions, voiceId: selectedVoiceId });
      }

      Alert.alert('Saved', 'Assistant settings updated.');
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  function renderSection(title: string, icon: string, children: React.ReactNode) {
    return (
      <View
        style={{
          backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
          borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
          borderRadius: radii.xl,
          padding: spacing.lg, marginBottom: spacing.lg,
          borderWidth: 1,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
          <Icon name={icon} size="md" color={colors.primary} />
          <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}>{title}</Text>
        </View>
        {children}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info banner */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            backgroundColor: colors.primary + '12',
            borderRadius: radii.xl,
            padding: spacing.md,
            marginBottom: spacing.lg,
            borderWidth: 1,
            borderColor: colors.primary + '25',
            gap: spacing.sm,
          }}
        >
          <Icon name="information-outline" size="md" color={colors.primary} />
          <Text style={{ ...typography.bodySmall, color: colors.textSecondary, flex: 1 }}>
            These settings apply to all callers by default. To customize behavior for a specific contact, edit their Contact Profile.
          </Text>
        </View>

        {error ? (
          <View style={{ padding: spacing.md, backgroundColor: colors.error + '15', borderRadius: radii.md, marginBottom: spacing.lg }}>
            <Text style={{ ...typography.body, color: colors.error }}>{error}</Text>
          </View>
        ) : null}

        {/* Assistant Name */}
        {renderSection('Assistant Name', 'badge-account-outline', (
          <TextInput
            value={assistantName}
            onChangeText={setAssistantName}
            placeholder="e.g., Alex"
            placeholderTextColor={colors.textDisabled}
            maxLength={60}
            style={{
              ...typography.body, color: colors.textPrimary,
              backgroundColor: colors.surface, borderRadius: radii.md,
              padding: spacing.md, borderWidth: 1, borderColor: colors.border,
            }}
          />
        ))}

        {/* Voice */}
        {renderSection('Voice', 'account-voice', (
          <TouchableOpacity
            onPress={() => setShowVoicePicker(true)}
            style={{
              backgroundColor: colors.surface, borderRadius: radii.md,
              padding: spacing.md, borderWidth: 1, borderColor: colors.border,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon name="microphone-outline" size="md" color={selectedVoice ? colors.primary : colors.textDisabled} />
              <Text style={{ ...typography.body, color: selectedVoice ? colors.textPrimary : colors.textDisabled }}>
                {selectedVoice ? selectedVoice.display_name : 'Choose a voice'}
              </Text>
            </View>
            <Icon name="chevron-right" size="md" color={colors.textDisabled} />
          </TouchableOpacity>
        ))}

        {/* Greeting */}
        {renderSection('Greeting Message', 'message-text-outline', (
          <TextInput
            value={greetingInstructions}
            onChangeText={setGreetingInstructions}
            placeholder="How your assistant greets callers"
            placeholderTextColor={colors.textDisabled}
            multiline numberOfLines={3} maxLength={500} textAlignVertical="top"
            style={{
              ...typography.body, color: colors.textPrimary,
              backgroundColor: colors.surface, borderRadius: radii.md,
              padding: spacing.md, borderWidth: 1, borderColor: colors.border,
              minHeight: 80,
            }}
          />
        ))}

        {/* Personality / Temperament */}
        {renderSection('Personality', 'emoticon-outline', (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {TEMPERAMENTS.map((t) => {
              const selected = temperament === t.value;
              return (
                <TouchableOpacity
                  key={t.value}
                  onPress={() => setTemperament(t.value)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
                    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
                    borderRadius: radii.md,
                    backgroundColor: selected ? colors.primaryContainer : colors.surface,
                    borderWidth: 1, borderColor: selected ? colors.primary : colors.border,
                  }}
                >
                  <Icon name={t.icon} size="sm" color={selected ? colors.primary : colors.textSecondary} />
                  <Text style={{ ...typography.bodySmall, color: selected ? colors.primary : colors.textPrimary, fontWeight: selected ? '600' : '400' }}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Swearing */}
        {renderSection('Language Rules', 'comment-text-outline', (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {SWEARING_RULES.map((r) => {
              const selected = swearingRule === r.value;
              return (
                <TouchableOpacity
                  key={r.value}
                  onPress={() => setSwearingRule(r.value)}
                  style={{
                    flex: 1, alignItems: 'center', gap: spacing.xs,
                    paddingVertical: spacing.md, borderRadius: radii.md,
                    backgroundColor: selected ? colors.primaryContainer : colors.surface,
                    borderWidth: 1, borderColor: selected ? colors.primary : colors.border,
                  }}
                >
                  <Icon name={r.icon} size="md" color={selected ? colors.primary : colors.textSecondary} />
                  <Text style={{
                    ...typography.caption, textAlign: 'center',
                    color: selected ? colors.primary : colors.textPrimary,
                    fontWeight: selected ? '600' : '400',
                  }}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Custom Instructions */}
        {renderSection('Custom Instructions', 'text-box-outline', (
          <>
            <TextInput
              value={userInstructions}
              onChangeText={setUserInstructions}
              placeholder="Special instructions for your AI agent..."
              placeholderTextColor={colors.textDisabled}
              multiline numberOfLines={4} maxLength={2000} textAlignVertical="top"
              style={{
                ...typography.body, color: colors.textPrimary,
                backgroundColor: colors.surface, borderRadius: radii.md,
                padding: spacing.md, borderWidth: 1, borderColor: colors.border,
                minHeight: 100,
              }}
            />
            <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs }}>
              These instructions are embedded in your AI agent's behavior on every call.
            </Text>
          </>
        ))}
      </ScrollView>

      {/* Save Button */}
      <View
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: spacing.lg, paddingBottom: insets.bottom + spacing.lg,
          backgroundColor: colors.background,
        }}
      >
        <TouchableOpacity
          onPress={handleSave}
          disabled={!hasChanges || saving}
          style={{
            backgroundColor: hasChanges ? colors.primary : colors.border,
            borderRadius: radii.lg, paddingVertical: spacing.md + 2,
            alignItems: 'center', opacity: saving ? 0.6 : 1, minHeight: 52,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={{ ...typography.button, color: hasChanges ? colors.onPrimary : colors.textDisabled }}>
              Save Changes
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Voice Picker Overlay */}
      {showVoicePicker && (
        <View
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: colors.background, zIndex: 100,
          }}
        >
          <View
            style={{
              flexDirection: 'row', alignItems: 'center',
              paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg,
              paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
              gap: spacing.md,
            }}
          >
            <TouchableOpacity onPress={() => { setPlayingVoiceId(null); setPreviewUrl(null); setShowVoicePicker(false); }} hitSlop={12}>
              <Icon name="arrow-left" size="md" color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }}>Choose a Voice</Text>
          </View>
          <FlatList
            data={voices}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
            renderItem={({ item }) => {
              const selected = selectedVoiceId === item.id;
              const isPlaying = playingVoiceId === item.id;
              return (
                <TouchableOpacity
                  onPress={() => { setSelectedVoiceId(item.id); setPlayingVoiceId(null); setPreviewUrl(null); setShowVoicePicker(false); }}
                  style={{
                    paddingVertical: spacing.md + 2, paddingHorizontal: spacing.lg,
                    backgroundColor: selected ? colors.primaryContainer : 'transparent',
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    borderBottomWidth: 1, borderBottomColor: colors.border + '40',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
                    <View
                      style={{
                        width: 40, height: 40, borderRadius: 20,
                        backgroundColor: selected ? colors.primary + '20' : colors.surface,
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Icon
                        name={item.gender_tag === 'female' ? 'face-woman' : item.gender_tag === 'male' ? 'face-man' : 'account-voice'}
                        size="md"
                        color={selected ? colors.primary : colors.textSecondary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...typography.body, color: selected ? colors.primary : colors.textPrimary, fontWeight: selected ? '600' : '400' }}>
                        {item.display_name}
                      </Text>
                      {item.gender_tag && (
                        <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                          {item.gender_tag.charAt(0).toUpperCase() + item.gender_tag.slice(1)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    {item.preview_url ? (
                      <TouchableOpacity
                        onPress={(e) => { e.stopPropagation(); togglePreview(item); }}
                        hitSlop={8}
                        style={{
                          width: 36, height: 36, borderRadius: 18,
                          backgroundColor: isPlaying ? colors.primary : colors.surface,
                          alignItems: 'center', justifyContent: 'center',
                          borderWidth: 1, borderColor: isPlaying ? colors.primary : colors.border,
                        }}
                      >
                        <Icon
                          name={isPlaying ? 'stop' : 'play'}
                          size="sm"
                          color={isPlaying ? colors.onPrimary : colors.textSecondary}
                        />
                      </TouchableOpacity>
                    ) : null}
                    {selected && <Icon name="check" size="md" color={colors.primary} />}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {previewUrl && (
        <Video
          source={{ uri: previewUrl }}
          style={{ width: 0, height: 0 }}
          paused={false}
          onEnd={() => { setPlayingVoiceId(null); setPreviewUrl(null); }}
          onError={() => { setPlayingVoiceId(null); setPreviewUrl(null); }}
          audioOnly
        />
      )}
    </View>
  );
}
