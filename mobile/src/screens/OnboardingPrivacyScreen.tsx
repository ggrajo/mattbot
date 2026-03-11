import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';

const PRIVACY_POINTS = [
  { icon: 'lock-outline', text: 'Calls are encrypted' },
  { icon: 'shield-check-outline', text: 'Transcripts stored securely' },
  { icon: 'brain', text: 'You control what AI remembers' },
  { icon: 'delete-outline', text: 'Data can be deleted anytime' },
];

export function OnboardingPrivacyScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    setLoading(true);
    try {
      await apiClient.post('/onboarding/complete-step', { step: 'privacy_review' });
      navigation.navigate('OnboardingSettings' as never);
    } catch (e) {
      Alert.alert('Error', extractApiError(e) || 'Failed to complete step');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: spacing.lg,
          paddingBottom: insets.bottom + 100,
        }}
      >
        {/* Illustration Area */}
        <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.primaryContainer,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="shield-lock-outline" size="xl" color={colors.primary} />
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
                backgroundColor: colors.surfaceElevated,
                borderRadius: radii.lg,
                padding: spacing.lg,
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
              I Understand — Continue
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
