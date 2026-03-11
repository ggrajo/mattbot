import React from 'react';
import { View, Text, Pressable, Switch, ViewStyle, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Icon } from './Icon';
import { SectionHeader } from './SectionHeader';
import { hapticLight } from '../../utils/haptics';

interface RowBase {
  icon: string;
  label: string;
  iconColor?: string;
  labelColor?: string;
  destructive?: boolean;
  disabled?: boolean;
}

interface NavRow extends RowBase {
  type?: 'nav';
  rightLabel?: string;
  onPress: () => void;
}

interface ToggleRow extends RowBase {
  type: 'toggle';
  value: boolean;
  onValueChange: (v: boolean) => void;
}

export type SettingsRowItem = NavRow | ToggleRow;

interface Props {
  title: string;
  subtitle?: string;
  rows: SettingsRowItem[];
  style?: ViewStyle;
}

export function SettingsSection({ title, subtitle, rows, style }: Props) {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;

  const cardBg = theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF';
  const cardBorder = theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder;
  const shadow = theme.dark
    ? {}
    : Platform.select({
        ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
        android: { elevation: 1 },
      }) || {};

  return (
    <View style={[{ marginTop: spacing.lg }, style]}>
      <SectionHeader title={title} subtitle={subtitle} />
      <View
        style={{
          marginHorizontal: spacing.lg,
          backgroundColor: cardBg,
          borderRadius: radii.xl,
          borderWidth: 1,
          borderColor: cardBorder,
          overflow: 'hidden',
          ...shadow,
        }}
      >
        {rows.map((row, idx) => {
          const isLast = idx === rows.length - 1;
          const iconColor = row.destructive ? colors.error : (row.iconColor || colors.primary);
          const textColor = row.destructive ? colors.error : (row.labelColor || colors.textPrimary);

          if (row.type === 'toggle') {
            return (
              <View
                key={row.label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  paddingHorizontal: spacing.lg,
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomColor: theme.dark ? 'rgba(255,255,255,0.05)' : colors.border,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: iconColor + '15',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={row.icon} size={18} color={iconColor} />
                </View>
                <Text style={{ fontSize: 15, color: textColor, flex: 1, marginLeft: spacing.md }}>
                  {row.label}
                </Text>
                <Switch
                  value={row.value}
                  onValueChange={(v) => { hapticLight(); row.onValueChange(v); }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  disabled={row.disabled}
                />
              </View>
            );
          }

          const navRow = row as NavRow;
          return (
            <Pressable
              key={row.label}
              onPress={() => { if (!row.disabled) { hapticLight(); navRow.onPress(); } }}
              disabled={row.disabled}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                paddingHorizontal: spacing.lg,
                backgroundColor: pressed ? (theme.dark ? 'rgba(255,255,255,0.04)' : colors.surfaceVariant) : 'transparent',
                borderBottomWidth: isLast ? 0 : 1,
                borderBottomColor: theme.dark ? 'rgba(255,255,255,0.05)' : colors.border,
              })}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: iconColor + '15',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={row.icon} size={18} color={iconColor} />
              </View>
              <Text style={{ fontSize: 15, color: textColor, flex: 1, marginLeft: spacing.md }}>
                {row.label}
              </Text>
              {navRow.rightLabel && (
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginRight: spacing.sm }}>
                  {navRow.rightLabel}
                </Text>
              )}
              {!row.destructive && !row.disabled && (
                <Icon name="chevron-right" size={18} color={colors.textDisabled} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
