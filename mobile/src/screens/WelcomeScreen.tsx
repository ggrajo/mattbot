import React from 'react';
import { View, Text, Platform, Dimensions, StyleSheet } from 'react-native';
import { GradientView } from '../components/ui/GradientView';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

const { width: SCREEN_W } = Dimensions.get('window');

export function WelcomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Ambient glow orbs */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <GradientView
          colors={[
            theme.dark ? 'rgba(129,140,248,0.15)' : 'rgba(129,140,248,0.08)',
            'transparent',
          ]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            position: 'absolute',
            top: -SCREEN_W * 0.3,
            left: -SCREEN_W * 0.2,
            width: SCREEN_W * 1.4,
            height: SCREEN_W * 1.4,
            borderRadius: SCREEN_W * 0.7,
          }}
        />
        <GradientView
          colors={[
            theme.dark ? 'rgba(167,139,250,0.10)' : 'rgba(167,139,250,0.06)',
            'transparent',
          ]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            position: 'absolute',
            bottom: -SCREEN_W * 0.4,
            right: -SCREEN_W * 0.3,
            width: SCREEN_W * 1.2,
            height: SCREEN_W * 1.2,
            borderRadius: SCREEN_W * 0.6,
          }}
        />
      </View>

      <View
        style={{
          flex: 1,
          paddingHorizontal: spacing.xl,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + spacing.lg,
        }}
      >
        {/* Top spacer */}
        <View style={{ flex: 1.2 }} />

        {/* Logo + branding */}
        <View style={{ alignItems: 'center' }}>
          <FadeIn delay={0} slide="up" scale>
            <View
              style={{
                width: 112,
                height: 112,
                borderRadius: 32,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                ...Platform.select({
                  ios: {
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: 0.5,
                    shadowRadius: 28,
                  },
                  android: { elevation: 12 },
                }),
              }}
            >
              <GradientView
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 112,
                  height: 112,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="phone-check-outline" size={52} color="#FFFFFF" />
              </GradientView>
            </View>
          </FadeIn>

          <FadeIn delay={200} spring>
            <Text
              style={{
                fontSize: 44,
                lineHeight: 52,
                fontWeight: '800',
                color: colors.textPrimary,
                textAlign: 'center',
                marginTop: spacing.xl,
                letterSpacing: -1,
              }}
              allowFontScaling
            >
              MattBot
            </Text>
          </FadeIn>

          <FadeIn delay={350}>
            <Text
              style={{
                ...typography.body,
                color: colors.textSecondary,
                textAlign: 'center',
                maxWidth: 280,
                lineHeight: 26,
                marginTop: spacing.sm,
                letterSpacing: 0.2,
              }}
              allowFontScaling
            >
              Your AI call concierge.{'\n'}Screens callers, captures what matters.
            </Text>
          </FadeIn>
        </View>

        {/* Feature pills */}
        <FadeIn delay={500}>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: spacing.sm,
              marginTop: spacing.xxl,
            }}
          >
            {[
              { icon: 'shield-check-outline', label: 'Call Screening' },
              { icon: 'account-voice', label: 'AI Concierge' },
              { icon: 'bell-ring-outline', label: 'Smart Alerts' },
            ].map((pill) => (
              <View
                key={pill.label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: theme.dark
                    ? 'rgba(129,140,248,0.08)'
                    : 'rgba(129,140,248,0.06)',
                  borderWidth: 1,
                  borderColor: theme.dark
                    ? 'rgba(129,140,248,0.15)'
                    : 'rgba(129,140,248,0.12)',
                  borderRadius: radii.full,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                }}
              >
                <Icon
                  name={pill.icon}
                  size={16}
                  color={colors.primary}
                />
                <Text
                  style={{
                    ...typography.caption,
                    color: theme.dark ? colors.textSecondary : colors.textPrimary,
                    fontWeight: '500',
                  }}
                >
                  {pill.label}
                </Text>
              </View>
            ))}
          </View>
        </FadeIn>

        {/* Spacer */}
        <View style={{ flex: 1.5 }} />

        {/* CTA */}
        <View style={{ width: '100%', maxWidth: 400, alignSelf: 'center' }}>
          <FadeIn delay={600} slide="up">
            <Button
              title="Get Started"
              icon="arrow-right"
              onPress={() => navigation.navigate('Register')}
              variant="primary"
            />
          </FadeIn>
          <FadeIn delay={700}>
            <Button
              title="I already have an account"
              onPress={() => navigation.navigate('Login')}
              variant="ghost"
              style={{ marginTop: spacing.xs }}
            />
          </FadeIn>
        </View>

        {/* Footer */}
        <FadeIn delay={800}>
          <Text
            style={{
              ...typography.caption,
              color: theme.dark
                ? 'rgba(148,163,184,0.4)'
                : 'rgba(100,116,139,0.5)',
              textAlign: 'center',
              marginTop: spacing.xl,
            }}
          >
            By continuing, you agree to our Terms of Service
          </Text>
        </FadeIn>
      </View>
    </View>
  );
}
