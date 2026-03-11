import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { apiClient } from '../api/client';
import { extractApiError } from '../api/client';
import type { Theme } from '../theme/tokens';

interface TranscriptTurn {
  role: 'assistant' | 'caller';
  content: string;
  time_seconds: number;
}

interface TranscriptResponse {
  turns: TranscriptTurn[];
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function LiveTranscriptScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { callId } = route.params as { callId: string };

  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const prevTurnsLengthRef = useRef(0);

  const fetchTranscript = useCallback(async () => {
    try {
      const { data } = await apiClient.get<TranscriptResponse>(
        `/calls/${callId}/transcript`
      );
      setTurns(data.turns ?? []);
      setError(null);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [callId]);

  useEffect(() => {
    fetchTranscript();
  }, [fetchTranscript]);

  useEffect(() => {
    const interval = setInterval(fetchTranscript, 5000);
    return () => clearInterval(interval);
  }, [fetchTranscript]);

  useEffect(() => {
    if (turns.length > prevTurnsLengthRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    prevTurnsLengthRef.current = turns.length;
  }, [turns.length]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            setLoading(true);
            fetchTranscript();
          }}
          style={styles.refreshButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, fetchTranscript, theme]);

  if (loading && turns.length === 0) {
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

  if (error && turns.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              fetchTranscript();
            }}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }}
      >
        <FadeIn delay={0}>
          <Text style={styles.title}>Live Transcript</Text>
          <Text style={styles.subtitle}>
            {turns.length === 0
              ? 'No transcript yet. Waiting for conversation...'
              : 'Real-time call transcript'}
          </Text>
        </FadeIn>

        {turns.length === 0 ? (
          <FadeIn delay={80}>
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyText}>No transcript yet</Text>
              <Text style={styles.emptyHint}>
                Transcript will appear here as the call progresses.
              </Text>
            </View>
          </FadeIn>
        ) : (
          <View style={styles.turnsContainer}>
            {turns.map((turn, idx) => (
              <FadeIn key={idx} delay={idx * 40}>
                <View
                  style={[
                    styles.bubbleRow,
                    turn.role === 'caller' && styles.bubbleRowRight,
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      turn.role === 'assistant'
                        ? styles.bubbleAssistant
                        : styles.bubbleCaller,
                    ]}
                  >
                    <Text style={styles.speakerLabel}>
                      {turn.role === 'assistant' ? 'Assistant' : 'Caller'}
                    </Text>
                    <Text style={styles.bubbleContent}>{turn.content}</Text>
                    <Text style={styles.timeLabel}>
                      {formatTime(turn.time_seconds)}
                    </Text>
                  </View>
                </View>
              </FadeIn>
            ))}
          </View>
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
    refreshButton: { marginRight: spacing.md },
    refreshText: {
      ...typography.bodySmall,
      color: colors.primary,
      fontWeight: '600',
    },
    errorBox: {
      backgroundColor: colors.errorContainer,
      margin: spacing.xl,
      padding: spacing.xl,
      borderRadius: radii.md,
    },
    errorText: { ...typography.bodySmall, color: colors.error },
    retryButton: {
      marginTop: spacing.md,
      marginLeft: 'auto',
    },
    retryText: {
      ...typography.button,
      color: colors.primary,
    },
    title: {
      ...typography.h1,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    subtitle: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      marginBottom: spacing.xl,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
    },
    emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
    emptyText: {
      ...typography.h3,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    emptyHint: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    turnsContainer: { gap: spacing.md },
    bubbleRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
    },
    bubbleRowRight: {
      justifyContent: 'flex-end',
    },
    bubble: {
      maxWidth: '85%',
      padding: spacing.md,
      borderRadius: radii.lg,
      borderBottomLeftRadius: spacing.xs,
    },
    bubbleAssistant: {
      backgroundColor: colors.primaryContainer,
      borderColor: colors.primary,
    },
    bubbleCaller: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomLeftRadius: radii.lg,
      borderBottomRightRadius: spacing.xs,
    },
    speakerLabel: {
      ...typography.caption,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    bubbleContent: {
      ...typography.body,
      color: colors.textPrimary,
      lineHeight: 22,
    },
    timeLabel: {
      ...typography.caption,
      color: colors.textDisabled,
      marginTop: spacing.xs,
    },
  });
}
