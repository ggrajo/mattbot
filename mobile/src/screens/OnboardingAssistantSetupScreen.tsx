import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { useAgentStore } from '../store/agentStore';
import { TextInput } from '../components/ui/TextInput';
import { Button } from '../components/ui/Button';
import type { Theme } from '../theme/tokens';

const PERSONALITIES = [
  { key: 'professional', label: 'Professional', description: 'Formal and business-oriented' },
  { key: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { key: 'casual', label: 'Casual', description: 'Relaxed and conversational' },
  { key: 'formal', label: 'Formal', description: 'Strict etiquette and protocol' },
] as const;

const VOICES = [
  { id: 'alloy', label: 'Alloy', description: 'Neutral and balanced' },
  { id: 'echo', label: 'Echo', description: 'Warm and resonant' },
  { id: 'fable', label: 'Fable', description: 'Expressive and dynamic' },
  { id: 'onyx', label: 'Onyx', description: 'Deep and authoritative' },
  { id: 'nova', label: 'Nova', description: 'Friendly and upbeat' },
  { id: 'shimmer', label: 'Shimmer', description: 'Clear and bright' },
] as const;

export function OnboardingAssistantSetupScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const navigation = useNavigation<any>();
  const { createAgent, loading } = useAgentStore();

  const [name, setName] = useState('');
  const [personality, setPersonality] = useState('professional');
  const [voiceId, setVoiceId] = useState('alloy');
  const [greeting, setGreeting] = useState(
    "Hi, you've reached my AI assistant. How can I help you today?"
  );

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please give your assistant a name.');
      return;
    }

    const agent = await createAgent({
      name: name.trim(),
      personality,
      voice_id: voiceId,
      greeting_message: greeting.trim(),
      language: 'en',
      is_active: true,
    });

    if (agent) {
      navigation.navigate('Home');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Set Up Your Assistant</Text>
        <Text style={styles.subtitle}>
          Customize how your AI call assistant behaves and sounds.
        </Text>

        <TextInput
          label="Assistant Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Matt, Luna, Aria"
          autoCapitalize="words"
        />

        <Text style={styles.sectionLabel}>Personality</Text>
        <View style={styles.optionsGrid}>
          {PERSONALITIES.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[
                styles.optionCard,
                personality === p.key && styles.optionCardSelected,
              ]}
              onPress={() => setPersonality(p.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionTitle,
                  personality === p.key && styles.optionTitleSelected,
                ]}
              >
                {p.label}
              </Text>
              <Text
                style={[
                  styles.optionDesc,
                  personality === p.key && styles.optionDescSelected,
                ]}
              >
                {p.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Voice</Text>
        <View style={styles.optionsGrid}>
          {VOICES.map((v) => (
            <TouchableOpacity
              key={v.id}
              style={[
                styles.optionCard,
                voiceId === v.id && styles.optionCardSelected,
              ]}
              onPress={() => setVoiceId(v.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionTitle,
                  voiceId === v.id && styles.optionTitleSelected,
                ]}
              >
                {v.label}
              </Text>
              <Text
                style={[
                  styles.optionDesc,
                  voiceId === v.id && styles.optionDescSelected,
                ]}
              >
                {v.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          label="Greeting Message"
          value={greeting}
          onChangeText={setGreeting}
          placeholder="What your assistant says when answering a call"
          multiline
          numberOfLines={3}
        />

        <Button
          title="Save & Continue"
          onPress={handleSave}
          loading={loading}
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
    scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
    heading: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.sm },
    subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl },
    sectionLabel: {
      ...typography.h3,
      color: colors.textPrimary,
      marginBottom: spacing.md,
      marginTop: spacing.sm,
    },
    optionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    optionCard: {
      width: '47%',
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
      ...shadows.card,
    },
    optionCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryContainer,
    },
    optionTitle: {
      ...typography.bodySmall,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    optionTitleSelected: { color: colors.primary },
    optionDesc: { ...typography.caption, color: colors.textSecondary },
    optionDescSelected: { color: colors.primary },
    saveButton: { marginTop: spacing.lg },
  });
}
