import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { GradientView } from '../components/ui/GradientView';
import { FadeIn } from '../components/ui/FadeIn';
import { OnboardingProgress } from '../components/ui/OnboardingProgress';
import { apiClient, extractApiError } from '../api/client';

const { width: SCREEN_W } = Dimensions.get('window');

const PRIVACY_POINTS = [
  { icon: 'lock-outline', text: 'Calls are encrypted' },
  { icon: 'shield-check-outline', text: 'Transcripts stored securely' },
  { icon: 'brain', text: 'You control what AI remembers' },
  { icon: 'delete-outline', text: 'Data can be deleted anytime' },
];

export function OnboardingPrivacyScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    setLoading(true);
    try {
      await apiClient.post('/onboarding/complete-step', { step: 'privacy_review' });
      navigation.navigate('OnboardingProfile' as never);
    } catch (e) {
      Alert.alert('Error', extractApiError(e) || 'Failed to complete step');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Ambient glow */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <GradientView
          colors={[theme.dark ? 'rgba(129,140,248,0.10)' : 'rgba(129,140,248,0.05)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', top: -SCREEN_W * 0.3, left: -SCREEN_W * 0.1, width: SCREEN_W * 1.2, height: SCREEN_W, borderRadius: SCREEN_W * 0.5 }}
        />
      </View>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: spacing.lg,
          paddingBottom: insets.bottom + 100,
        }}
      >
        <OnboardingProgress currentStep={1} totalSteps={8} />

        {/* Illustration Area */}
        <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              overflow: 'hidden',
            }}
          >
            <GradientView
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="shield-lock-outline" size={36} color="#FFFFFF" />
            </GradientView>
          </View>
        </View>

        {/* Title & Description */}
        <Text
          style={{ ...typography.h1, color: colors.textPrimary, textAlign: 'center' }}
          allowFontScaling
        >
          Privacy & Data
        </Text>
        <Text
          style={{
            ...typography.body,
            color: colors.textSecondary,
            textAlign: 'center',
            marginTop: spacing.sm,
            marginBottom: spacing.xxl,
          }}
          allowFontScaling
        >
          Review how MattBot handles your data
        </Text>

        {/* Privacy Points */}
        <View style={{ gap: spacing.md }}>
          {PRIVACY_POINTS.map((point) => (
            <View
              key={point.text}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                borderRadius: radii.lg,
                padding: spacing.lg,
                borderWidth: 1,
                borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radii.md,
                  backgroundColor: colors.successContainer,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="check" size="md" color={colors.success} />
              </View>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Icon name={point.icon} size="md" color={colors.textSecondary} />
                <Text style={{ ...typography.body, color: colors.textPrimary, flex: 1 }} allowFontScaling>
                  {point.text}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
          backgroundColor: colors.background,
        }}
      >
        <TouchableOpacity
          onPress={handleContinue}
          disabled={loading}
          style={{
            backgroundColor: colors.primary,
            borderRadius: radii.lg,
            paddingVertical: spacing.md + 2,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: spacing.sm,
            opacity: loading ? 0.6 : 1,
            minHeight: 52,
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={{ ...typography.button, color: colors.onPrimary }} allowFontScaling>
              I Understand ΓÇö Continue
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
