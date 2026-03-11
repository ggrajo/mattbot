import React from 'react';
import { View, ViewStyle, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { GradientView } from './GradientView';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Skip the gradient shimmer edge (use for nested cards) */
  flat?: boolean;
  /** Override the tint color in dark mode */
  tint?: string;
  /** Padding override (default: spacing.lg) */
  padding?: number;
}

export function GlassCard({ children, style, flat, tint, padding }: Props) {
  const theme = useTheme();
  const { colors, spacing, radii, shadows } = theme;

  const pad = padding ?? spacing.lg;

  if (theme.dark) {
    const tintColor = tint || colors.primary;
    return (
      <View
        style={[
          {
            borderRadius: radii.xl,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            backgroundColor: 'rgba(255,255,255,0.04)',
            overflow: 'hidden',
          },
          style,
        ]}
      >
        {!flat && (
          <GradientView
            colors={[tintColor + '08', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 80,
            }}
          />
        )}
        <View style={{ padding: pad }}>{children}</View>
      </View>
    );
  }

  return (
    <View
      style={[
        {
          backgroundColor: '#FFFFFF',
          borderRadius: radii.xl,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          ...Platform.select({
            ios: {
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
            },
            android: { elevation: 2 },
          }),
        },
        style,
      ]}
    >
      <View style={{ padding: pad }}>{children}</View>
    </View>
  );
}
