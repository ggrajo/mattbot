import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import { hapticMedium } from '../utils/haptics';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingComplete'>;

export function OnboardingCompleteScreen({ navigation }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const nickname = useAuthStore(s => s.nickname);
  const displayName = useAuthStore(s => s.displayName);
  const name = nickname || displayName || '';

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  function handleGetStarted() {
    hapticMedium();
    navigation.reset({ index: 0, routes: [{ name: 'DrawerRoot' }] });
  }

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '-8deg', '0deg'],
  });

  return (
    <ScreenWrapper scroll={false} keyboardAvoiding={false} safeEdges={['top', 'bottom', 'left', 'right']}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl }}>

        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }, { rotate: rotation }],
            marginBottom: spacing.xl,
          }}
        >
          <Animated.View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: colors.success + '1A',
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: pulseAnim }],
            }}
          >
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                backgroundColor: colors.success + '30',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="check-bold" size={48} color={colors.success} />
            </View>
          </Animated.View>
        </Animated.View>

        <FadeIn delay={400} slide="up">
          <Text
            style={{
              ...typography.h1,
              color: colors.textPrimary,
              textAlign: 'center',
              marginBottom: spacing.sm,
            }}
            allowFontScaling
          >
            You're All Set{name ? `, ${name}` : ''}!
          </Text>
        </FadeIn>

        <FadeIn delay={600} slide="up">
          <Text
            style={{
              ...typography.body,
              color: colors.textSecondary,
              textAlign: 'center',
              marginBottom: spacing.xl,
              lineHeight: 22,
            }}
            allowFontScaling
          >
            Your AI assistant is ready to handle calls, take messages, and manage your schedule. You can always adjust settings from the home screen.
          </Text>
        </FadeIn>

        <FadeIn delay={800}>
          <View
            style={{
              width: '100%',
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              padding: spacing.lg,
              gap: spacing.md,
              marginBottom: spacing.xl,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{ ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600', textAlign: 'center' }}
              allowFontScaling
            >
              WHAT'S NEXT
            </Text>

            {[
              { icon: 'phone-incoming', text: 'Calls to your AI number will be handled automatically' },
              { icon: 'account-group-outline', text: 'Add contacts to personalize how calls are handled' },
              { icon: 'book-open-outline', text: 'Add documents to your Knowledge Base for smarter answers' },
              { icon: 'cog-outline', text: 'Fine-tune your assistant in Settings anytime' },
            ].map((item, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: colors.primary + '14',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={item.icon} size="sm" color={colors.primary} />
                </View>
                <Text
                  style={{ ...typography.bodySmall, color: colors.textPrimary, flex: 1 }}
                  allowFontScaling
                >
                  {item.text}
                </Text>
              </View>
            ))}
          </View>
        </FadeIn>

        <FadeIn delay={1000}>
          <Button
            title="Get Started"
            icon="rocket-launch-outline"
            onPress={handleGetStarted}
            style={{ width: '100%' }}
          />
        </FadeIn>
      </View>
    </ScreenWrapper>
  );
}
