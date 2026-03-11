import React, { useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Video from 'react-native-video';
import { useTheme } from '../../theme/ThemeProvider';
import { Icon } from './Icon';
import type { VoiceCatalogItem } from '../../api/agents';

interface VoiceChipProps {
  voice: VoiceCatalogItem;
  selected: boolean;
  onSelect: (voice: VoiceCatalogItem) => void;
  playingId: string | null;
  onPlayingChange: (id: string | null) => void;
}

export function VoiceChip({
  voice,
  selected,
  onSelect,
  playingId,
  onPlayingChange,
}: VoiceChipProps) {
  const { colors, spacing, typography, radii } = useTheme();
  const videoRef = useRef<any>(null);
  const isPlaying = playingId === voice.id;

  const handlePlayToggle = useCallback(() => {
    if (isPlaying) {
      onPlayingChange(null);
    } else {
      onPlayingChange(voice.id);
    }
  }, [isPlaying, voice.id, onPlayingChange]);

  const handleEnd = useCallback(() => {
    onPlayingChange(null);
  }, [onPlayingChange]);

  return (
    <TouchableOpacity
      onPress={() => onSelect(voice)}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radii.lg,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primary + '0A' : colors.surface,
        marginBottom: spacing.sm,
        gap: spacing.sm,
      }}
    >
      {voice.preview_url && (
        <TouchableOpacity
          onPress={handlePlayToggle}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon
            name={isPlaying ? 'stop-circle-outline' : 'play-circle-outline'}
            size="md"
            color={colors.primary}
          />
        </TouchableOpacity>
      )}

      <View style={{ flex: 1 }}>
        <Text
          style={{
            ...typography.body,
            color: selected ? colors.primary : colors.textPrimary,
            fontWeight: selected ? '600' : '400',
          }}
          numberOfLines={1}
        >
          {voice.display_name}
        </Text>
        {voice.gender_tag && (
          <Text style={{ ...typography.caption, color: colors.textSecondary }}>
            {voice.gender_tag}
          </Text>
        )}
      </View>

      {selected && (
        <Icon name="check-circle" size="sm" color={colors.primary} />
      )}

      {isPlaying && voice.preview_url && (
        <Video
          ref={videoRef}
          source={{ uri: voice.preview_url }}
          audioOnly
          paused={false}
          onEnd={handleEnd}
          onError={handleEnd}
          style={{ width: 0, height: 0 }}
        />
      )}
    </TouchableOpacity>
  );
}

interface DefaultVoiceChipProps {
  selected: boolean;
  onSelect: () => void;
}

export function DefaultVoiceChip({ selected, onSelect }: DefaultVoiceChipProps) {
  const { colors, spacing, typography, radii } = useTheme();

  return (
    <TouchableOpacity
      onPress={onSelect}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radii.lg,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primary + '0A' : colors.surface,
        marginBottom: spacing.sm,
        gap: spacing.sm,
      }}
    >
      <Icon name="account-voice" size="md" color={selected ? colors.primary : colors.textSecondary} />
      <Text
        style={{
          ...typography.body,
          flex: 1,
          color: selected ? colors.primary : colors.textPrimary,
          fontWeight: selected ? '600' : '400',
        }}
      >
        Default Voice
      </Text>
      {selected && <Icon name="check-circle" size="sm" color={colors.primary} />}
    </TouchableOpacity>
  );
}
