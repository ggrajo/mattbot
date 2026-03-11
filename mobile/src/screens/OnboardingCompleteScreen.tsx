import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing, Dimensions, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { GradientView } from '../components/ui/GradientView';
import { useAuthStore } from '../store/authStore';

const { width: SCREEN_W } = Dimensions.get('window');

export function OnboardingCompleteScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const nickname = useAuthStore((s) => s.nickname);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [scaleAnim, fadeAnim, slideAnim]);

  const greeting = nickname ? `You're all set, ${nickname}!` : "You're All Set!";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingHorizontal: spacing.lg,
        paddingTop: insets.top,
        paddingBottom: insets.bottom + spacing.xl,
      }}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <GradientView
          colors={[theme.dark ? 'rgba(16,185,129,0.10)' : 'rgba(16,185,129,0.05)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', top: -SCREEN_W * 0.2, left: -SCREEN_W * 0.1, width: SCREEN_W * 1.2, height: SCREEN_W, borderRadius: SCREEN_W * 0.5 }}
        />
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            width: 120,
            height: 120,
            borderRadius: 36,
            overflow: 'hidden',
            marginBottom: spacing.xl,
          }}
        >
          <GradientView
            colors={['#10B981', '#14B8A6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="check-decagram" size={64} color="#FFFFFF" />
          </GradientView>
        </Animated.View>

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              ...typography.h1,
              color: colors.textPrimary,
              textAlign: 'center',
              marginBottom: spacing.sm,
            }}
          >
            {greeting}
          </Text>

          <Text
            style={{
              ...typography.body,
              color: colors.textSecondary,
              textAlign: 'center',
              lineHeight: 24,
              marginBottom: spacing.xxl,
              paddingHorizontal: spacing.md,
            }}
          >
            Your AI assistant is ready to handle calls. You can fine-tune everything from Settings anytime.
          </Text>

          <View
            style={{
              backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
              borderWidth: 1,
              borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
              borderRadius: radii.xl,
              padding: spacing.lg,
              width: '100%',
              gap: spacing.md,
            }}
          >
            {[
              { icon: 'shield-check-outline', text: 'Privacy preferences saved' },
              { icon: 'account-check-outline', text: 'Profile configured' },
              { icon: 'robot-outline', text: 'AI assistant personalized' },
              { icon: 'phone-check-outline', text: 'Phone number provisioned' },
              { icon: 'phone-forward-outline', text: 'Call handling configured' },
            ].map((item, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                }}
              >
                <Icon name={item.icon} size="md" color={colors.success} />
                <Text style={{ ...typography.body, color: colors.textPrimary, flex: 1 }}>
                  {item.text}
                </Text>
                <Icon name="check" size="sm" color={colors.success} />
              </View>
            ))}
          </View>
        </Animated.View>
      </View>

      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity
          onPress={() => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'TabRoot' }],
            });
          }}
          style={{
            backgroundColor: colors.primary,
            borderRadius: radii.lg,
            paddingVertical: spacing.md + 2,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: spacing.sm,
            minHeight: 52,
          }}
          activeOpacity={0.8}
        >
          <Text style={{ ...typography.button, color: colors.onPrimary }}>
            Go to Dashboard
          </Text>
          <Icon name="arrow-right" size="sm" color={colors.onPrimary} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
