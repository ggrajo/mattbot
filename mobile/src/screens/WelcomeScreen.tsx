import React from 'react';
import { View, Text, Platform } from 'react-native';
import { GradientView } from '../components/ui/GradientView';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const insets = useSafeAreaInsets();

  return (
    <GradientView
      colors={
        theme.dark
          ? [colors.background, '#1E1B4B', colors.background]
          : [colors.background, '#EEF2FF', colors.background]
      }
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={{ flex: 1 }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          gap: spacing.xxxl,
        }}
      >
        <View style={{ alignItems: 'center', gap: spacing.xl }}>
          <FadeIn delay={0} slide="up" scale>
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: radii.xxl,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                ...Platform.select({
                  ios: {
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.4,
                    shadowRadius: 20,
                  },
                  android: { elevation: 8 },
                }),
              }}
            >
              <GradientView
                colors={[colors.gradientStart, colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 96,
                  height: 96,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="phone-check-outline" size={48} color="#FFFFFF" />
              </GradientView>
            </View>
          </FadeIn>

          <FadeIn delay={150} spring>
            <Text
              style={{
                ...typography.display,
                color: colors.textPrimary,
                textAlign: 'center',
              }}
              allowFontScaling
            >
              MattBot
            </Text>
          </FadeIn>
          <FadeIn delay={250}>
            <Text
              style={{
                ...typography.body,
                color: colors.textSecondary,
                textAlign: 'center',
                maxWidth: 300,
                lineHeight: 24,
              }}
              allowFontScaling
            >
              Your AI call concierge.{'\n'}Screens callers, captures what matters.
            </Text>
          </FadeIn>
        </View>

        <View style={{ width: '100%', maxWidth: 400, gap: spacing.sm }}>
          <FadeIn delay={350} slide="up">
            <Button
              title="Get Started"
              icon="account-plus-outline"
              onPress={() => navigation.navigate('Register')}
              variant="primary"
            />
          </FadeIn>
          <FadeIn delay={450}>
            <Button
              title="I already have an account"
              onPress={() => navigation.navigate('Login')}
              variant="ghost"
            />
          </FadeIn>
        </View>
      </View>
    </GradientView>
  );
}
