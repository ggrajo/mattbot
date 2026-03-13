import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { PulsingDot } from '../components/ui/PulsingDot';
import { useTheme } from '../theme/ThemeProvider';
import { useRealtimeStore } from '../store/realtimeStore';
import { useSettingsStore } from '../store/settingsStore';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'LiveTranscript'>;

interface TranscriptTurn {
  role: 'user' | 'agent';
  text: string;
  ts: string;
}

export function LiveTranscriptScreen({ navigation, route }: Props) {
  const { callId } = route.params;
  const { colors, spacing, typography, radii } = useTheme();
  const userTz = useSettingsStore((s) => s.settings?.timezone) || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const liveTranscript = useRealtimeStore((s) => s.liveTranscript);
  const activeCallId = useRealtimeStore((s) => s.activeCallId);
  const flatListRef = useRef<FlatList>(null);

  const isLive = activeCallId === callId && !liveTranscript?.ended;
  const isEnded = liveTranscript?.ended === true;
  const turns =
    liveTranscript?.callId === callId ? liveTranscript.turns : [];
  const prevTurnCount = useRef(turns.length);

  useEffect(() => {
    if (turns.length > prevTurnCount.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    prevTurnCount.current = turns.length;
  }, [turns.length]);

  const formatTs = useCallback((ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: userTz,
      });
    } catch {
      return '';
    }
  }, []);

  function renderBubble({
    item,
    index,
  }: {
    item: TranscriptTurn;
    index: number;
  }) {
    const isAgent = item.role === 'agent';

    return (
      <FadeIn delay={0}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: isAgent ? 'flex-start' : 'flex-end',
            marginBottom: spacing.sm,
            paddingHorizontal: spacing.sm,
          }}
        >
          {isAgent && (
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: colors.primary + '20',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.xs,
                marginTop: 4,
              }}
            >
              <Icon name="robot" size="sm" color={colors.primary} />
            </View>
          )}

          <View
            style={{
              maxWidth: '75%',
              backgroundColor: isAgent
                ? colors.primary
                : colors.surfaceVariant,
              borderRadius: radii.lg,
              borderTopLeftRadius: isAgent ? radii.sm : radii.lg,
              borderTopRightRadius: isAgent ? radii.lg : radii.sm,
              paddingVertical: spacing.sm + 2,
              paddingHorizontal: spacing.md,
            }}
          >
            <Text
              style={{
                ...typography.bodySmall,
                color: isAgent ? '#FFFFFF' : colors.textPrimary,
                fontWeight: '600',
                marginBottom: 2,
              }}
              allowFontScaling
            >
              {isAgent ? 'AI Assistant' : 'Caller'}
            </Text>
            <Text
              style={{
                ...typography.body,
                color: isAgent ? '#FFFFFF' : colors.textPrimary,
                lineHeight: 22,
              }}
              allowFontScaling
            >
              {item.text}
            </Text>
            <Text
              style={{
                ...typography.caption,
                color: isAgent
                  ? 'rgba(255,255,255,0.6)'
                  : colors.textDisabled,
                marginTop: 4,
                textAlign: 'right',
                fontSize: 10,
              }}
              allowFontScaling
            >
              {formatTs(item.ts)}
            </Text>
          </View>

          {!isAgent && (
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: colors.textSecondary + '20',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: spacing.xs,
                marginTop: 4,
              }}
            >
              <Icon name="account" size="sm" color={colors.textSecondary} />
            </View>
          )}
        </View>
      </FadeIn>
    );
  }

  return (
    <ScreenWrapper scroll={false} keyboardAvoiding={false}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          marginBottom: spacing.md,
        }}
      >
        <Icon name="text-box-outline" size="lg" color={colors.primary} />
        <Text
          style={{ ...typography.h2, color: colors.textPrimary, flex: 1 }}
          allowFontScaling
        >
          Live Transcript
        </Text>
        {isLive && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: colors.error + '18',
              paddingVertical: 4,
              paddingHorizontal: spacing.sm,
              borderRadius: radii.xl,
            }}
          >
            <PulsingDot color={colors.error} />
            <Text
              style={{
                ...typography.caption,
                fontSize: 11,
                color: colors.error,
                fontWeight: '700',
              }}
            >
              LIVE
            </Text>
          </View>
        )}
      </View>

      {/* Ended Banner */}
      {isEnded && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: colors.surfaceVariant,
            borderRadius: radii.md,
            padding: spacing.md,
            marginBottom: spacing.md,
          }}
        >
          <Icon name="phone-hangup" size="md" color={colors.textSecondary} />
          <Text
            style={{
              ...typography.body,
              color: colors.textSecondary,
              fontWeight: '500',
            }}
            allowFontScaling
          >
            Call ended
          </Text>
        </View>
      )}

      {/* Transcript */}
      <FlatList
        ref={flatListRef}
        data={turns}
        renderItem={renderBubble}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={
          turns.length === 0
            ? { flex: 1, justifyContent: 'center', alignItems: 'center' }
            : { paddingBottom: spacing.xl, paddingTop: spacing.sm }
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', gap: spacing.md }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.primary + '14',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon
                name="microphone-outline"
                size={32}
                color={colors.primary}
              />
            </View>
            <Text
              style={{
                ...typography.body,
                color: colors.textSecondary,
                textAlign: 'center',
              }}
              allowFontScaling
            >
              Listening for conversation...
            </Text>
            {isLive && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
              >
                <PulsingDot color={colors.primary} />
                <Text
                  style={{
                    ...typography.caption,
                    color: colors.textDisabled,
                  }}
                  allowFontScaling
                >
                  Connected to live call
                </Text>
              </View>
            )}
          </View>
        }
        onContentSizeChange={() => {
          if (turns.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
      />
    </ScreenWrapper>
  );
}
