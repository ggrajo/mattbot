import React from 'react';
import { View, Text, SafeAreaView, Dimensions } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { useTheme } from '../theme/ThemeProvider';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

const FEATURES = [
  { icon: 'shield-lock-outline', text: 'End-to-end encrypted messaging' },
  { icon: 'robot-outline', text: 'AI-powered smart assistant' },
  { icon: 'account-group-outline', text: 'Seamless team collaboration' },
  { icon: 'lightning-bolt-outline', text: 'Real-time sync across devices' },
] as const;

export function WelcomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const screenHeight = Dimensions.get('window').height;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Gradient-inspired hero background */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: screenHeight * 0.45,
          backgroundColor: colors.primary,
          borderBottomLeftRadius: radii.xxl,
          borderBottomRightRadius: radii.xxl,
        }}
      />

      <View
        style={{
          flex: 1,
          paddingHorizontal: spacing.xl,
        }}
      >
        {/* Branding section */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(100)}
          style={{
            alignItems: 'center',
            paddingTop: screenHeight * 0.08,
            paddingBottom: spacing.xxl,
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: radii.xl,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.lg,
            }}
          >
            <Icon name="robot-outline" size={48} color={colors.onPrimary} />
          </View>
          <Text
            style={{
              ...typography.h1,
              fontSize: 32,
              color: colors.onPrimary,
              letterSpacing: -0.5,
            }}
            allowFontScaling
          >
            MattBot
          </Text>
          <Text
            style={{
              ...typography.body,
              color: 'rgba(255,255,255,0.8)',
              textAlign: 'center',
              marginTop: spacing.xs,
            }}
            allowFontScaling
          >
            Secure communications for your team
          </Text>
        </Animated.View>

        {/* Feature highlights */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(300)}
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            padding: spacing.lg,
            gap: spacing.md,
            ...theme.shadows.card,
          }}
        >
          {FEATURES.map((feature, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radii.sm,
                  backgroundColor: colors.primaryContainer,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={feature.icon} size="md" color={colors.primary} />
              </View>
              <Text
                style={{
                  ...typography.bodySmall,
                  color: colors.textPrimary,
                  flex: 1,
                }}
                allowFontScaling
              >
                {feature.text}
              </Text>
            </View>
          ))}
        </Animated.View>

        {/* CTA buttons */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(500)}
          style={{
            marginTop: 'auto',
            paddingBottom: spacing.xxl,
            gap: spacing.md,
          }}
        >
          <Button
            title="Get Started"
            onPress={() => navigation.navigate('Register')}
            variant="primary"
            icon="arrow-right"
          />
          <Button
            title="Sign In"
            onPress={() => navigation.navigate('Login')}
            variant="outline"
          />
          <Text
            style={{
              ...typography.caption,
              color: colors.textSecondary,
              textAlign: 'center',
              marginTop: spacing.xs,
            }}
            allowFontScaling
          >
            By continuing, you agree to our Terms of Service
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
