import React from 'react';
import { View, Text, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  icon?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ListRow({
  icon,
  iconColor,
  title,
  subtitle,
  right,
  onPress,
  style,
  accessibilityLabel,
}: Props) {
  const theme = useTheme();
  const { colors, spacing, radii, typography } = theme;

  const resolvedIconColor = iconColor ?? colors.primary;

  const inner = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: radii.xl,
          padding: spacing.lg,
          gap: spacing.md,
          borderLeftWidth: 3,
          borderLeftColor: resolvedIconColor + '20',
        },
        style,
      ]}
    >
      {icon && (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radii.md,
            backgroundColor: resolvedIconColor + '14',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size="md" color={resolvedIconColor} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text
          style={{ ...typography.body, color: colors.textPrimary, fontWeight: '500' }}
          numberOfLines={1}
          allowFontScaling
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={{ ...typography.caption, color: colors.textSecondary, marginTop: 2 }}
            numberOfLines={1}
            allowFontScaling
          >
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );

  if (onPress) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <AnimatedPressable
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 400 });
        }}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        style={animatedStyle}
      >
        {inner}
      </AnimatedPressable>
    );
  }

  return inner;
}
