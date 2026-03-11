import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';

interface AgentFields {
  name: string;
  greeting_message: string;
  personality_description: string;
  voice_id: string;
}

interface Voice {
  id: string;
  name: string;
  preview_url?: string;
}

export function AssistantSettingsScreen() {
  const { colors, spacing, typography, radii } = useTheme();

  const [agentId, setAgentId] = useState('');
  const [fields, setFields] = useState<AgentFields>({ name: '', greeting_message: '', personality_description: '', voice_id: '' });
  const [original, setOriginal] = useState<AgentFields>({ name: '', greeting_message: '', personality_description: '', voice_id: '' });
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError('');

      Promise.all([
        apiClient.get('/agents'),
        apiClient.get('/voices'),
      ])
        .then(([agentsRes, voicesRes]) => {
          if (!active) return;
          const agents = agentsRes.data.items ?? agentsRes.data;
          const agent = Array.isArray(agents) && agents.length > 0 ? agents[0] : null;
          if (agent) {
            setAgentId(agent.id);
            const vals: AgentFields = {
              name: agent.name ?? '',
              greeting_message: agent.greeting_message ?? '',
              personality_description: agent.personality_description ?? '',
              voice_id: agent.voice_id ?? '',
            };
            setFields(vals);
            setOriginal(vals);
          }
          const v = voicesRes.data.items ?? voicesRes.data;
          if (Array.isArray(v)) setVoices(v);
        })
        .catch((err) => {
          if (active) setError(extractApiError(err));
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => { active = false; };
    }, []),
  );

  const hasChanges = JSON.stringify(fields) !== JSON.stringify(original);

  async function handleSave() {
    if (!agentId) return;
    setSaving(true);
    setError('');
    try {
      const changed: Partial<AgentFields> = {};
      for (const k of Object.keys(fields) as (keyof AgentFields)[]) {
        if (fields[k] !== original[k]) changed[k] = fields[k];
      }
      await apiClient.patch(`/agents/${agentId}`, changed);
      setOriginal(fields);
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      keyboardShouldPersistTaps="handled"
    >
      {error ? (
        <View style={{ padding: spacing.lg }}>
          <Text style={{ ...typography.body, color: colors.error }}>{error}</Text>
        </View>
      ) : null}

      <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, gap: spacing.md }}>
        <View>
          <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs }}>Agent Name</Text>
          <TextInput
            value={fields.name}
            onChangeText={(v) => setFields((p) => ({ ...p, name: v }))}
            placeholder="Agent name"
            placeholderTextColor={colors.textDisabled}
            style={{
              ...typography.body,
              color: colors.textPrimary,
              backgroundColor: colors.surface,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: colors.border,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
            }}
          />
        </View>

        <View>
          <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs }}>Greeting Message</Text>
          <TextInput
            value={fields.greeting_message}
            onChangeText={(v) => setFields((p) => ({ ...p, greeting_message: v }))}
            placeholder="How your assistant greets callers"
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={3}
            style={{
              ...typography.body,
              color: colors.textPrimary,
              backgroundColor: colors.surface,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: colors.border,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />
        </View>

        <View>
          <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs }}>Personality Description</Text>
          <TextInput
            value={fields.personality_description}
            onChangeText={(v) => setFields((p) => ({ ...p, personality_description: v }))}
            placeholder="Describe how your assistant should behave"
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={3}
            style={{
              ...typography.body,
              color: colors.textPrimary,
              backgroundColor: colors.surface,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: colors.border,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />
        </View>
      </View>

      <View style={{ marginTop: spacing.xl, marginHorizontal: spacing.lg }}>
        <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md }}>Voice</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {voices.map((voice) => {
            const selected = fields.voice_id === voice.id;
            return (
              <TouchableOpacity
                key={voice.id}
                onPress={() => setFields((p) => ({ ...p, voice_id: voice.id }))}
                style={{
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.lg,
                  borderRadius: radii.md,
                  backgroundColor: selected ? colors.primary : colors.surface,
                  borderWidth: 1,
                  borderColor: selected ? colors.primary : colors.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
              >
                <Icon name="account-voice" size="md" color={selected ? colors.onPrimary : colors.textSecondary} />
                <Text style={{ ...typography.body, color: selected ? colors.onPrimary : colors.textPrimary }}>{voice.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={{ marginTop: spacing.xl, marginHorizontal: spacing.lg }}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!hasChanges || saving}
          style={{
            backgroundColor: hasChanges ? colors.primary : colors.border,
            borderRadius: radii.md,
            paddingVertical: spacing.md,
            alignItems: 'center',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={{ ...typography.button, color: hasChanges ? colors.onPrimary : colors.textDisabled }}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
