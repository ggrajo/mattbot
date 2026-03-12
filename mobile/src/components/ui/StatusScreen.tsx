import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import { Icon } from './Icon';
import { Button } from './Button';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  icon: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  action?: { title: string; onPress: () => void; variant?: 'primary' | 'outline' | 'ghost' };
  secondaryAction?: { title: string; onPress: () => void };
  children?: React.ReactNode;
  style?: ViewStyle;
}

export function StatusScreen({
  icon,
  iconColor,
  title,
  subtitle,
  action,
  secondaryAction,
  children,
  style,
}: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;

  return (
    <View
      style={[
        {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
          gap: spacing.lg,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: (iconColor ?? colors.primary) + '18',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.sm,
        }}
      >
        <Icon name={icon} size={40} color={iconColor ?? colors.primary} />
      </View>

      <Text
        style={{ ...typography.h2, color: colors.textPrimary, textAlign: 'center' }}
        allowFontScaling
      >
        {title}
      </Text>

      {subtitle && (
        <Text
          style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center', maxWidth: 320 }}
          allowFontScaling
        >
          {subtitle}
        </Text>
      )}

      {children}

      {action && (
        <Button
          title={action.title}
          onPress={action.onPress}
          variant={action.variant ?? 'primary'}
          style={{ width: '100%', marginTop: spacing.md } as ViewStyle}
        />
      )}

      {secondaryAction && (
        <Button
          title={secondaryAction.title}
          onPress={secondaryAction.onPress}
          variant="ghost"
          style={{ width: '100%' } as ViewStyle}
        />
      )}
    </View>
  );
}
