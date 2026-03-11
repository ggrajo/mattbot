import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { useAgentStore } from '../store/agentStore';
import { settingsApi } from '../api/settings';
import { TextInput } from '../components/ui/TextInput';
import { Button } from '../components/ui/Button';
import { VoiceChip } from '../components/ui/VoiceChip';
import type { Theme } from '../theme/tokens';

const PERSONALITIES = ['professional', 'friendly', 'casual', 'formal'] as const;
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ja', label: 'Japanese' },
] as const;

const FALLBACK_VOICES = [
  { id: 'alloy', label: 'Alloy' },
  { id: 'echo', label: 'Echo' },
  { id: 'fable', label: 'Fable' },
  { id: 'onyx', label: 'Onyx' },
  { id: 'nova', label: 'Nova' },
  { id: 'shimmer', label: 'Shimmer' },
] as const;

export function AssistantSettingsScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const agentId = route.params?.agentId as string | undefined;

  const {
    currentAgent,
    loading,
    error,
    fetchAgents,
    fetchAgent,
    updateAgent,
    voiceCatalog,
    voicesLoading,
    fetchVoiceCatalog,
  } = useAgentStore();

  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [greetingMessage, setGreetingMessage] = useState('');
  const [voiceId, setVoiceId] = useState('alloy');
  const [language, setLanguage] = useState('en');
  const [personality, setPersonality] = useState<string>('professional');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchVoiceCatalog();
    if (agentId) {
      fetchAgent(agentId);
    } else {
      fetchAgents();
    }
  }, [agentId, fetchAgent, fetchAgents, fetchVoiceCatalog]);

  useEffect(() => {
    if (currentAgent) {
      setName(currentAgent.name);
      setSystemPrompt(currentAgent.system_prompt ?? '');
      setGreetingMessage(currentAgent.greeting_message ?? '');
      setVoiceId(currentAgent.voice_id ?? 'alloy');
      setLanguage(currentAgent.language ?? 'en');
      setPersonality(currentAgent.personality ?? 'professional');
    }
  }, [currentAgent]);

  const handlePreview = async (vid: string) => {
    try {
      const { data } = await settingsApi.getVoicePreview(vid);
      if (data.preview_url) {
        await Linking.openURL(data.preview_url);
      }
    } catch {
      Alert.alert('Preview', 'Voice preview is not available at the moment.');
    }
  };

  const handleSave = async () => {
    if (!currentAgent) return;
    setSaving(true);
    const updated = await updateAgent(currentAgent.id, {
      name: name.trim(),
      system_prompt: systemPrompt.trim(),
      greeting_message: greetingMessage.trim(),
      voice_id: voiceId,
      language,
      personality,
    });
    setSaving(false);
    if (updated) {
      Alert.alert('Saved', 'Assistant settings updated successfully.');
      navigation.goBack();
    }
  };

  if (loading && !currentAgent) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasVoiceCatalog = voiceCatalog.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Assistant Settings</Text>

        <TextInput
          label="Assistant Name"
          value={name}
          onChangeText={setName}
          placeholder="Your assistant's name"
        />

        <TextInput
          label="System Prompt"
          value={systemPrompt}
          onChangeText={setSystemPrompt}
          placeholder="Instructions that guide your assistant's behavior"
          multiline
          numberOfLines={6}
        />

        <TextInput
          label="Greeting Message"
          value={greetingMessage}
          onChangeText={setGreetingMessage}
          placeholder="What your assistant says when answering"
          multiline
          numberOfLines={3}
        />

        <Text style={styles.sectionLabel}>Personality</Text>
        <View style={styles.segmentedControl}>
          {PERSONALITIES.map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.segment,
                personality === p && styles.segmentActive,
              ]}
              onPress={() => setPersonality(p)}
            >
              <Text
                style={[
                  styles.segmentText,
                  personality === p && styles.segmentTextActive,
                ]}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Voice</Text>
        {voicesLoading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginBottom: 16 }} />
        ) : hasVoiceCatalog ? (
          <View style={styles.voiceList}>
            {voiceCatalog.map((v) => (
              <VoiceChip
                key={v.voice_id}
                name={v.name}
                gender={v.gender ?? undefined}
                accent={v.accent ?? undefined}
                selected={voiceId === v.voice_id}
                onPress={() => setVoiceId(v.voice_id)}
                onPreview={() => handlePreview(v.voice_id)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.chipRow}>
            {FALLBACK_VOICES.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={[styles.chip, voiceId === v.id && styles.chipActive]}
                onPress={() => setVoiceId(v.id)}
              >
                <Text
                  style={[styles.chipText, voiceId === v.id && styles.chipTextActive]}
                >
                  {v.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.sectionLabel}>Language</Text>
        <View style={styles.chipRow}>
          {LANGUAGES.map((l) => (
            <TouchableOpacity
              key={l.code}
              style={[styles.chip, language === l.code && styles.chipActive]}
              onPress={() => setLanguage(l.code)}
            >
              <Text
                style={[styles.chipText, language === l.code && styles.chipTextActive]}
              >
                {l.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={saving}
          style={styles.saveButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, spacing, radii, typography, shadows } = theme;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    loader: { marginTop: spacing.xxl },
    scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
    heading: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.xl },
    errorBox: {
      backgroundColor: colors.errorContainer,
      margin: spacing.xl,
      padding: spacing.md,
      borderRadius: radii.md,
    },
    errorText: { ...typography.bodySmall, color: colors.error },
    sectionLabel: {
      ...typography.h3,
      color: colors.textPrimary,
      marginTop: spacing.md,
      marginBottom: spacing.md,
    },
    segmentedControl: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceVariant,
      borderRadius: radii.md,
      padding: 3,
      marginBottom: spacing.xl,
    },
    segment: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      borderRadius: radii.sm,
    },
    segmentActive: {
      backgroundColor: colors.primary,
      ...shadows.card,
    },
    segmentText: {
      ...typography.caption,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    segmentTextActive: { color: colors.onPrimary },
    voiceList: {
      marginBottom: spacing.xl,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    chip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryContainer,
    },
    chipText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '500' },
    chipTextActive: { color: colors.primary, fontWeight: '600' },
    saveButton: { marginTop: spacing.lg },
  });
}
