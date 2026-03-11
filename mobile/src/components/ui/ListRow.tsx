import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface ListRowProps {
  label: string;
  hint?: string;
  icon?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  showChevron?: boolean;
}

export function ListRow({ label, hint, icon, onPress, trailing, showChevron = true }: ListRowProps) {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;

  const content = (
    <View style={styles.row}>
      {icon && (
        <View style={[styles.iconWrap, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
      )}
      <View style={styles.textArea}>
        <Text style={[typography.body, { color: colors.textPrimary }]}>{label}</Text>
        {hint && (
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
            {hint}
          </Text>
        )}
      </View>
      {trailing}
      {showChevron && onPress && (
        <Text style={[styles.chevron, { color: colors.textDisabled }]}>›</Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.6}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
  textArea: {
    flex: 1,
  },
  chevron: {
    fontSize: 20,
    fontWeight: '600',
  },
});
