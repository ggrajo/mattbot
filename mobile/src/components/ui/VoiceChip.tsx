import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface VoiceChipProps {
  name: string;
  gender?: string;
  accent?: string;
  selected: boolean;
  onPress: () => void;
  onPreview?: () => void;
}

export function VoiceChip({ name, gender, accent, selected, onPress, onPreview }: VoiceChipProps) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.primaryContainer : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <Text style={[styles.name, { color: selected ? theme.colors.primary : theme.colors.textPrimary }]}>{name}</Text>
        {(gender || accent) && (
          <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
            {[gender, accent].filter(Boolean).join(' · ')}
          </Text>
        )}
      </View>
      {onPreview && (
        <TouchableOpacity onPress={onPreview} style={styles.previewButton}>
          <Text style={{ color: theme.colors.primary, fontSize: 18 }}>▶</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1.5, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  content: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13, marginTop: 2 },
  previewButton: { padding: 8 },
});
