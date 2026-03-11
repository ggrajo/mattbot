import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Video from 'react-native-video';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { GradientView } from '../components/ui/GradientView';
import { OnboardingProgress } from '../components/ui/OnboardingProgress';
import { apiClient, extractApiError } from '../api/client';

const { width: SCREEN_W } = Dimensions.get('window');

interface Voice {
  id: string;
  display_name: string;
  gender_tag?: string | null;
  preview_url?: string | null;
}

const TEMPERAMENTS = [
  { value: 'professional_polite', label: 'Professional', icon: 'briefcase-outline', desc: 'Formal and business-like' },
  { value: 'casual_friendly', label: 'Friendly', icon: 'emoticon-happy-outline', desc: 'Warm and conversational' },
  { value: 'short_and_direct', label: 'Direct', icon: 'lightning-bolt-outline', desc: 'Short and to the point' },
  { value: 'warm_and_supportive', label: 'Supportive', icon: 'heart-outline', desc: 'Empathetic and caring' },
  { value: 'formal', label: 'Formal', icon: 'school-outline', desc: 'Very polished and proper' },
];

const SWEARING_RULES = [
  { value: 'no_swearing', label: 'No swearing', icon: 'shield-check-outline', desc: 'Always keep it clean' },
  { value: 'mirror_caller', label: 'Mirror caller', icon: 'swap-horizontal', desc: 'Match the caller\'s tone' },
  { value: 'allow', label: 'Allow', icon: 'alert-circle-outline', desc: 'No restrictions on language' },
];

export function OnboardingAssistantSetupScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(1);
  const [name, setName] = useState('');
  const [greeting, setGreeting] = useState('');
  const [temperament, setTemperament] = useState('professional_polite');
  const [swearingRule, setSwearingRule] = useState('no_swearing');
  const [userInstructions, setUserInstructions] = useState('');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [voicesLoading, setVoicesLoading] = useState(true);
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get('/settings').catch(() => null),
      apiClient.get('/voices').catch(() => null),
      apiClient.get('/agents').catch(() => null),
    ]).then(([settingsRes, voicesRes, agentsRes]) => {
      if (settingsRes?.data) {
        setRevision(settingsRes.data.revision ?? 1);
        if (settingsRes.data.assistant_name) setName(settingsRes.data.assistant_name);
        if (settingsRes.data.temperament_preset) setTemperament(settingsRes.data.temperament_preset);
        if (settingsRes.data.swearing_rule) setSwearingRule(settingsRes.data.swearing_rule);
      }
      if (voicesRes?.data) {
        const v = voicesRes.data.items ?? voicesRes.data;
        if (Array.isArray(v)) setVoices(v);
      }
      if (agentsRes?.data) {
        const agents = agentsRes.data.items ?? agentsRes.data;
        const agent = Array.isArray(agents) && agents.length > 0 ? agents[0] : null;
        if (agent) {
          if (agent.user_instructions) setUserInstructions(agent.user_instructions);
          if (agent.greeting_instructions) setGreeting(agent.greeting_instructions);
          if (agent.voice?.voice_id) setSelectedVoiceId(agent.voice.voice_id);
        }
      }
    }).finally(() => setVoicesLoading(false));
  }, []);

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

  async function handleContinue() {
    setLoading(true);
    try {
      const freshSettings = (await apiClient.get('/settings')).data;
      const currentRevision = freshSettings.revision ?? revision;

      await apiClient.patch('/settings', {
        expected_revision: currentRevision,
        changes: {
          assistant_name: name || undefined,
          temperament_preset: temperament,
          swearing_rule: swearingRule,
        },
      });

      const agents = (await apiClient.get('/agents')).data;
      const agentList = agents.items ?? agents;
      let agent = Array.isArray(agentList) && agentList.length > 0 ? agentList[0] : null;

      if (!agent) {
        const createRes = await apiClient.post('/agents/default', {
          display_name: name || undefined,
          voice_id: selectedVoiceId || undefined,
          user_instructions: userInstructions || undefined,
        });
        agent = createRes.data;
      } else {
        await apiClient.patch(`/agents/${agent.id}`, {
          display_name: name || undefined,
          voice_id: selectedVoiceId || undefined,
          user_instructions: userInstructions || undefined,
          greeting_instructions: greeting || undefined,
          expected_revision: agent.revision,
        });
      }

      await apiClient.post('/onboarding/complete-step', { step: 'assistant_setup' });
      navigation.navigate('OnboardingCalendarSetup' as never);
    } catch (e) {
      Alert.alert('Error', extractApiError(e) || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  }

  function renderSection(title: string, icon: string, children: React.ReactNode) {
    return (
      <View
        style={{
          backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
          borderWidth: 1,
          borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
          borderRadius: radii.xl,
          padding: spacing.lg,
          marginBottom: spacing.lg,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
          <Icon name={icon} size="md" color={colors.primary} />
          <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }} allowFontScaling>
            {title}
          </Text>
        </View>
        {children}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <GradientView
          colors={[theme.dark ? 'rgba(167,139,250,0.10)' : 'rgba(167,139,250,0.05)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', top: -SCREEN_W * 0.3, right: -SCREEN_W * 0.1, width: SCREEN_W, height: SCREEN_W, borderRadius: SCREEN_W * 0.5 }}
        />
      </View>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: spacing.lg,
          paddingBottom: insets.bottom + 100,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <OnboardingProgress currentStep={4} totalSteps={8} />

        <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <View
            style={{
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: colors.primaryContainer,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="robot-outline" size="xl" color={colors.primary} />
          </View>
        </View>

        <Text style={{ ...typography.h1, color: colors.textPrimary, textAlign: 'center' }} allowFontScaling>
          Meet Your AI Assistant
        </Text>
        <Text
          style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xxl }}
          allowFontScaling
        >
          Customize how your assistant handles calls
        </Text>

        {/* Assistant Name */}
        {renderSection('Assistant Name', 'badge-account-outline', (
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g., Matt"
            placeholderTextColor={colors.textDisabled}
            maxLength={60}
            style={{
              ...typography.body, color: colors.textPrimary,
              backgroundColor: colors.surface, borderRadius: radii.md,
              padding: spacing.md, borderWidth: 1, borderColor: colors.border,
            }}
          />
        ))}

        {/* Voice Selection */}
        {renderSection('Voice', 'account-voice', (
          <>
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
                  {voicesLoading ? 'Loading voices...' : selectedVoice ? selectedVoice.display_name : 'Choose a voice'}
                </Text>
              </View>
              <Icon name="chevron-down" size="md" color={colors.textDisabled} />
            </TouchableOpacity>
            {selectedVoice?.gender_tag && (
              <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs }}>
                {selectedVoice.gender_tag}
              </Text>
            )}
          </>
        ))}

        {/* Greeting */}
        {renderSection('Greeting Message', 'message-text-outline', (
          <TextInput
            value={greeting}
            onChangeText={setGreeting}
            placeholder="e.g., Hi! You've reached Matt's assistant."
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={3}
            maxLength={500}
            textAlignVertical="top"
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
          <View style={{ gap: spacing.sm }}>
            {TEMPERAMENTS.map((t) => (
              <TouchableOpacity
                key={t.value}
                onPress={() => setTemperament(t.value)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: spacing.md,
                  padding: spacing.md, borderRadius: radii.md,
                  backgroundColor: temperament === t.value ? colors.primaryContainer : colors.surface,
                  borderWidth: 1, borderColor: temperament === t.value ? colors.primary : colors.border,
                }}
              >
                <Icon name={t.icon} size="lg" color={temperament === t.value ? colors.primary : colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.body, color: temperament === t.value ? colors.primary : colors.textPrimary, fontWeight: '600' }}>
                    {t.label}
                  </Text>
                  <Text style={{ ...typography.caption, color: colors.textSecondary }}>{t.desc}</Text>
                </View>
                {temperament === t.value && <Icon name="check-circle" size="md" color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Swearing Rule */}
        {renderSection('Language Rules', 'comment-text-outline', (
          <View style={{ gap: spacing.sm }}>
            {SWEARING_RULES.map((r) => (
              <TouchableOpacity
                key={r.value}
                onPress={() => setSwearingRule(r.value)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: spacing.md,
                  padding: spacing.md, borderRadius: radii.md,
                  backgroundColor: swearingRule === r.value ? colors.primaryContainer : colors.surface,
                  borderWidth: 1, borderColor: swearingRule === r.value ? colors.primary : colors.border,
                }}
              >
                <Icon name={r.icon} size="lg" color={swearingRule === r.value ? colors.primary : colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.body, color: swearingRule === r.value ? colors.primary : colors.textPrimary, fontWeight: '600' }}>
                    {r.label}
                  </Text>
                  <Text style={{ ...typography.caption, color: colors.textSecondary }}>{r.desc}</Text>
                </View>
                {swearingRule === r.value && <Icon name="check-circle" size="md" color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* User Instructions */}
        {renderSection('Custom Instructions', 'text-box-outline', (
          <>
            <TextInput
              value={userInstructions}
              onChangeText={setUserInstructions}
              placeholder="e.g., Always ask for a callback number. Never schedule meetings on Fridays."
              placeholderTextColor={colors.textDisabled}
              multiline
              numberOfLines={4}
              maxLength={2000}
              textAlignVertical="top"
              style={{
                ...typography.body, color: colors.textPrimary,
                backgroundColor: colors.surface, borderRadius: radii.md,
                padding: spacing.md, borderWidth: 1, borderColor: colors.border,
                minHeight: 100,
              }}
            />
            <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs }}>
              These instructions will be embedded in your AI agent's behavior.
            </Text>
          </>
        ))}
      </ScrollView>

      {/* Bottom Button */}
      <View
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: spacing.lg, paddingBottom: insets.bottom + spacing.lg,
          backgroundColor: colors.background,
        }}
      >
        <TouchableOpacity
          onPress={handleContinue}
          disabled={loading}
          style={{
            backgroundColor: colors.primary, borderRadius: radii.lg,
            paddingVertical: spacing.md + 2, alignItems: 'center', justifyContent: 'center',
            flexDirection: 'row', gap: spacing.sm,
            opacity: loading ? 0.6 : 1, minHeight: 52,
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={{ ...typography.button, color: colors.onPrimary }}>Continue</Text>
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
