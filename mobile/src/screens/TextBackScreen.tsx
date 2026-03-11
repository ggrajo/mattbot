import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { FadeIn } from '../components/ui/FadeIn';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useTheme } from '../theme/ThemeProvider';
import { apiClient } from '../api/client';
import { extractApiError } from '../api/client';
import type { Theme } from '../theme/tokens';

interface TextBackTemplate {
  id: string;
  label: string;
  body: string;
}

type TextBackState = 'editing' | 'preview' | 'sent';

export function TextBackScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { callId } = route.params as { callId: string };

  const [templates, setTemplates] = useState<TextBackTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [message, setMessage] = useState('');
  const [state, setState] = useState<TextBackState>('editing');
  const [actionId, setActionId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<TextBackTemplate[]>('/messages/templates/text-back')
      .then(({ data }) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => setTemplates([]))
      .finally(() => setLoadingTemplates(false));
  }, []);

  const handleSelectTemplate = (t: TextBackTemplate) => {
    setMessage(t.body);
  };

  const handleDraft = async () => {
    if (!message.trim()) {
      Alert.alert('Empty message', 'Please enter a message to send.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const { data } = await apiClient.post<{ action_id: string; preview: string }>(
        `/messages/calls/${callId}/text-back/draft`,
        { body: message.trim() }
      );
      setActionId(data.action_id);
      setPreview(data.preview ?? message.trim());
      setState('preview');
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSending(false);
    }
  };

  const handleApproveAndSend = async () => {
    if (!actionId) return;
    setSending(true);
    setError(null);
    try {
      await apiClient.post(`/messages/actions/${actionId}/approve`);
      setState('sent');
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSending(false);
    }
  };

  const handleBackToEdit = () => {
    setState('editing');
    setActionId(null);
    setPreview(null);
  };

  if (loadingTemplates && templates.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
          style={styles.loader}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FadeIn delay={0}>
          <Text style={styles.title}>Text Back</Text>
          <Text style={styles.subtitle}>
            Send a follow-up message to the caller after the call.
          </Text>
        </FadeIn>

        {error && (
          <FadeIn delay={40}>
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          </FadeIn>
        )}

        {state === 'editing' && (
          <>
            <FadeIn delay={80}>
              <Text style={styles.sectionLabel}>Template</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipScroll}
              >
                {templates.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.chip,
                      message === t.body && styles.chipActive,
                    ]}
                    onPress={() => handleSelectTemplate(t)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        message === t.body && styles.chipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </FadeIn>

            <FadeIn delay={120}>
              <Text style={styles.sectionLabel}>Message</Text>
              <TextInput
                style={styles.messageInput}
                value={message}
                onChangeText={setMessage}
                placeholder="Type your follow-up message..."
                placeholderTextColor={theme.colors.textDisabled}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </FadeIn>

            <FadeIn delay={160}>
              <Button
                title="Draft"
                onPress={handleDraft}
                loading={sending}
                style={styles.draftButton}
              />
            </FadeIn>
          </>
        )}

        {state === 'preview' && (
          <>
            <FadeIn delay={80}>
              <Card>
                <Text style={styles.previewLabel}>Preview</Text>
                <Text style={styles.previewBody}>{preview ?? message}</Text>
              </Card>
            </FadeIn>
            <FadeIn delay={120}>
              <Button
                title="Approve & Send"
                onPress={handleApproveAndSend}
                loading={sending}
                style={styles.sendButton}
              />
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackToEdit}
                disabled={sending}
              >
                <Text style={styles.backButtonText}>Back to edit</Text>
              </TouchableOpacity>
            </FadeIn>
          </>
        )}

        {state === 'sent' && (
          <FadeIn delay={80}>
            <View style={styles.successBox}>
              <Text style={styles.successEmoji}>✓</Text>
              <Text style={styles.successTitle}>Message sent</Text>
              <Text style={styles.successText}>
                Your follow-up message has been sent to the caller.
              </Text>
            </View>
          </FadeIn>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, spacing, radii, typography } = theme;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    loader: { marginTop: spacing.xxl },
    scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
    title: {
      ...typography.h1,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.xl,
    },
    errorBox: {
      backgroundColor: colors.errorContainer,
      padding: spacing.md,
      borderRadius: radii.md,
      marginBottom: spacing.lg,
    },
    errorText: { ...typography.bodySmall, color: colors.error },
    sectionLabel: {
      ...typography.h3,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    chipScroll: {
      flexDirection: 'row',
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
    chipText: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    chipTextActive: { color: colors.primary, fontWeight: '600' },
    messageInput: {
      ...typography.body,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radii.md,
      padding: spacing.md,
      minHeight: 4 * 24 + spacing.md * 2,
      marginBottom: spacing.xl,
    },
    draftButton: { marginBottom: spacing.md },
    sendButton: { marginBottom: spacing.sm },
    backButton: {
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    backButtonText: {
      ...typography.bodySmall,
      color: colors.primary,
      fontWeight: '600',
    },
    previewLabel: {
      ...typography.caption,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    previewBody: {
      ...typography.body,
      color: colors.textPrimary,
      lineHeight: 24,
    },
    successBox: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
    },
    successEmoji: {
      fontSize: 48,
      color: colors.success,
      marginBottom: spacing.md,
    },
    successTitle: {
      ...typography.h2,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    successText: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
}
