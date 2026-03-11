import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonLoader({ width = '100%', height = 16, borderRadius, style }: Props) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;
  const radius = borderRadius ?? theme.radii.sm;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: theme.colors.skeleton,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function CallListSkeleton() {
  const theme = useTheme();
  const { spacing, radii, colors } = theme;

  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <Animated.View
          key={i}
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            padding: spacing.lg,
            marginBottom: spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <SkeletonLoader width={44} height={44} borderRadius={radii.md} />
          <Animated.View style={{ flex: 1, gap: spacing.xs }}>
            <SkeletonLoader width="60%" height={18} />
            <SkeletonLoader width="80%" height={14} />
          </Animated.View>
        </Animated.View>
      ))}
    </>
  );
}
