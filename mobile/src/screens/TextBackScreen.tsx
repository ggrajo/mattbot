import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { apiClient } from '../api/client';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'TextBack'>;

export function TextBackScreen({ route }: Props) {
  const { callId } = route.params;
  const { colors, spacing, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [templates, setTemplates] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  async function loadTemplates() {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get('/messages/templates/text-back');
      const items = res.templates ?? res.items ?? res.data ?? res ?? [];
      setTemplates(items);
      setError(undefined);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { loadTemplates(); }, []));

  function selectTemplate(template: any) {
    setSelectedTemplate(template.id || template.name);
    setMessage(template.body || template.content || template.text || '');
  }

  async function handleSend() {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setSending(true);
    try {
      const { data: draft } = await apiClient.post(`/messages/calls/${callId}/text-back/draft`, {
        body: message.trim(),
      });
      const actionId = draft.action_id || draft.id;
      if (actionId) {
        await apiClient.post(`/messages/actions/${actionId}/approve`);
      }
      Alert.alert('Sent', 'Your text-back message has been sent.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error?.message || 'Failed to send message');
    } finally {
      setSending(false);
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
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Icon name="arrow-left" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ ...typography.h3, color: colors.textPrimary, marginLeft: spacing.md }}>Text Back</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {error && (
          <View style={{ backgroundColor: colors.errorContainer, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.lg }}>
            <Text style={{ ...typography.bodySmall, color: colors.error }}>{error}</Text>
          </View>
        )}

        {templates.length > 0 && (
          <FadeIn delay={0}>
            <Text style={{ ...typography.caption, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm }}>
              TEMPLATES
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: spacing.xl }}
              contentContainerStyle={{ gap: spacing.sm }}
            >
              {templates.map((t: any, idx: number) => {
                const isSelected = selectedTemplate === (t.id || t.name);
                return (
                  <Pressable
                    key={t.id || idx}
                    onPress={() => selectTemplate(t)}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderRadius: radii.full,
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderWidth: 1,
                      borderColor: isSelected ? colors.primary : colors.border,
                    }}
                  >
                    <Text
                      style={{
                        ...typography.caption,
                        fontWeight: '600',
                        color: isSelected ? colors.onPrimary : colors.textPrimary,
                      }}
                      numberOfLines={1}
                    >
                      {t.name || t.label || `Template ${idx + 1}`}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </FadeIn>
        )}

        <FadeIn delay={60}>
          <Text style={{ ...typography.caption, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm }}>
            MESSAGE
          </Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Type your message..."
            placeholderTextColor={colors.textDisabled}
            multiline
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.lg,
              minHeight: 150,
              ...typography.body,
              color: colors.textPrimary,
              textAlignVertical: 'top',
            }}
          />
        </FadeIn>

        <FadeIn delay={100}>
          <Pressable
            onPress={handleSend}
            disabled={sending || !message.trim()}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              marginTop: spacing.xl,
              paddingVertical: spacing.md + 2,
              backgroundColor: !message.trim() ? colors.textDisabled : pressed ? colors.primary + 'CC' : colors.primary,
              borderRadius: radii.lg,
            })}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Icon name="send" size={20} color={colors.onPrimary} />
            )}
            <Text style={{ ...typography.button, color: colors.onPrimary }}>
              {sending ? 'Sending...' : 'Send Message'}
            </Text>
          </Pressable>
        </FadeIn>
      </ScrollView>
    </View>
  );
}
