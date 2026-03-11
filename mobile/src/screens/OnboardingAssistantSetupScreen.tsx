import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';

const PERSONALITIES: Array<{ label: string; value: string; icon: string; description: string }> = [
  { label: 'Friendly', value: 'friendly', icon: 'emoticon-happy-outline', description: 'Warm and conversational' },
  { label: 'Professional', value: 'professional', icon: 'briefcase-outline', description: 'Formal and business-like' },
  { label: 'Casual', value: 'casual', icon: 'hand-wave-outline', description: 'Relaxed and easygoing' },
];

export function OnboardingAssistantSetupScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [greeting, setGreeting] = useState('');
  const [personality, setPersonality] = useState('friendly');

  async function handleContinue() {
    setLoading(true);
    try {
      await apiClient.patch('/settings', {
        assistant_name: name || undefined,
        greeting_message: greeting || undefined,
        personality,
      });
      await apiClient.post('/onboarding/complete-step', { step: 'assistant_setup' });
      navigation.navigate('OnboardingCalendarSetup' as never);
    } catch (e) {
      Alert.alert('Error', extractApiError(e) || 'Failed to save settings');
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
        keyboardShouldPersistTaps="handled"
      >
        {/* Illustration Area */}
        <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
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
            <Icon name="robot-outline" size="xl" color={colors.primary} />
          </View>
        </View>

        {/* Title & Description */}
        <Text
          style={{ ...typography.h1, color: colors.textPrimary, textAlign: 'center' }}
          allowFontScaling
        >
          Meet Your AI Assistant
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
          Customize how your assistant handles calls
        </Text>

        {/* Assistant Name */}
        <View
          style={{
            backgroundColor: colors.surfaceElevated,
            borderRadius: radii.xl,
            padding: spacing.lg,
            marginBottom: spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
            <Icon name="badge-account-outline" size="md" color={colors.primary} />
            <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }} allowFontScaling>
              Assistant Name
            </Text>
          </View>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g., Matt"
            placeholderTextColor={colors.textDisabled}
            style={{
              ...typography.body,
              color: colors.textPrimary,
              backgroundColor: colors.surface,
              borderRadius: radii.md,
              padding: spacing.md,
              borderWidth: 1,
              borderColor: colors.border,
            }}
            allowFontScaling
          />
        </View>

        {/* Greeting Message */}
        <View
          style={{
            backgroundColor: colors.surfaceElevated,
            borderRadius: radii.xl,
            padding: spacing.lg,
            marginBottom: spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
            <Icon name="message-text-outline" size="md" color={colors.primary} />
            <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }} allowFontScaling>
              Greeting Message
            </Text>
          </View>
          <TextInput
            value={greeting}
            onChangeText={setGreeting}
            placeholder="e.g., Hi! You've reached Matt's assistant. How can I help?"
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{
              ...typography.body,
              color: colors.textPrimary,
              backgroundColor: colors.surface,
              borderRadius: radii.md,
              padding: spacing.md,
              borderWidth: 1,
              borderColor: colors.border,
              minHeight: 80,
            }}
            allowFontScaling
          />
        </View>

        {/* Personality Picker */}
        <View
          style={{
            backgroundColor: colors.surfaceElevated,
            borderRadius: radii.xl,
            padding: spacing.lg,
            marginBottom: spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
            <Icon name="account-voice" size="md" color={colors.primary} />
            <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }} allowFontScaling>
              Personality
            </Text>
          </View>
          <View style={{ gap: spacing.sm }}>
            {PERSONALITIES.map((p) => (
              <TouchableOpacity
                key={p.value}
                onPress={() => setPersonality(p.value)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.md,
                  borderRadius: radii.md,
                  backgroundColor: personality === p.value ? colors.primaryContainer : colors.surface,
                  borderWidth: 1,
                  borderColor: personality === p.value ? colors.primary : colors.border,
                }}
              >
                <Icon
                  name={p.icon}
                  size="lg"
                  color={personality === p.value ? colors.primary : colors.textSecondary}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      ...typography.body,
                      color: personality === p.value ? colors.primary : colors.textPrimary,
                      fontWeight: '600',
                    }}
                    allowFontScaling
                  >
                    {p.label}
                  </Text>
                  <Text
                    style={{ ...typography.caption, color: colors.textSecondary }}
                    allowFontScaling
                  >
                    {p.description}
                  </Text>
                </View>
                {personality === p.value && (
                  <Icon name="check-circle" size="md" color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
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
              Continue
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
