import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { OnboardingProgress } from '../components/ui/OnboardingProgress';
import { apiClient, extractApiError } from '../api/client';
import { useAuthStore } from '../store/authStore';

interface ProfileField {
  key: string;
  label: string;
  placeholder: string;
  icon: string;
  required: boolean;
  maxLength: number;
}

const FIELDS: ProfileField[] = [
  { key: 'nickname', label: 'Nickname', placeholder: 'How should we call you?', icon: 'at', required: true, maxLength: 40 },
  { key: 'display_name', label: 'Full Name', placeholder: 'Your full name (optional)', icon: 'account-outline', required: false, maxLength: 100 },
  { key: 'company_name', label: 'Company', placeholder: 'Where do you work? (optional)', icon: 'office-building-outline', required: false, maxLength: 100 },
  { key: 'role_title', label: 'Role / Title', placeholder: 'e.g., CEO, Freelancer (optional)', icon: 'briefcase-outline', required: false, maxLength: 100 },
];

export function OnboardingProfileScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const setProfileName = useAuthStore(s => s.setProfileName);

  const [values, setValues] = useState<Record<string, string>>({
    nickname: '', display_name: '', company_name: '', role_title: '',
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [nicknameError, setNicknameError] = useState('');

  useEffect(() => {
    apiClient.get('/me')
      .then(res => {
        const d = res.data;
        setValues({
          nickname: d.nickname ?? '',
          display_name: d.display_name ?? '',
          company_name: d.company_name ?? '',
          role_title: d.role_title ?? '',
        });
      })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, []);

  function updateField(key: string, val: string) {
    setValues(prev => ({ ...prev, [key]: val }));
    if (key === 'nickname') setNicknameError('');
  }

  async function handleContinue() {
    const nick = values.nickname.trim();
    if (!nick) {
      setNicknameError('Nickname is required');
      return;
    }
    if (nick.length < 2) {
      setNicknameError('Nickname must be at least 2 characters');
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, string> = { nickname: nick };
      if (values.display_name.trim()) payload.display_name = values.display_name.trim();
      if (values.company_name.trim()) payload.company_name = values.company_name.trim();
      if (values.role_title.trim()) payload.role_title = values.role_title.trim();

      await apiClient.patch('/me', payload);
      setProfileName(payload.display_name || null, nick);

      await apiClient.post('/onboarding/complete-step', { step: 'profile_setup' });
      navigation.navigate('OnboardingSettings' as never);
    } catch (e) {
      Alert.alert('Error', extractApiError(e) || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            padding: spacing.lg,
            paddingBottom: insets.bottom + 100,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <OnboardingProgress currentStep={2} totalSteps={8} />

          <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <View
              style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: colors.primaryContainer,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon name="account-edit-outline" size="xl" color={colors.primary} />
            </View>
          </View>

          <Text style={{ ...typography.h1, color: colors.textPrimary, textAlign: 'center' }} allowFontScaling>
            Tell Us About You
          </Text>
          <Text
            style={{
              ...typography.body, color: colors.textSecondary, textAlign: 'center',
              marginTop: spacing.sm, marginBottom: spacing.xxl,
            }}
            allowFontScaling
          >
            Your nickname will be used throughout the app
          </Text>

          <View style={{ gap: spacing.lg }}>
            {FIELDS.map((field) => (
              <View
                key={field.key}
                style={{
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: radii.xl,
                  padding: spacing.lg,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                  <Icon name={field.icon} size="md" color={colors.primary} />
                  <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}>
                    {field.label}
                  </Text>
                  {field.required && (
                    <View style={{
                      backgroundColor: colors.primary + '20',
                      borderRadius: radii.sm,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 2,
                    }}>
                      <Text style={{ ...typography.caption, color: colors.primary, fontWeight: '700', fontSize: 10 }}>
                        REQUIRED
                      </Text>
                    </View>
                  )}
                </View>
                <TextInput
                  value={values[field.key]}
                  onChangeText={(v) => updateField(field.key, v)}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.textDisabled}
                  maxLength={field.maxLength}
                  autoCapitalize={field.key === 'nickname' ? 'none' : 'words'}
                  style={{
                    ...typography.body,
                    color: colors.textPrimary,
                    backgroundColor: colors.surface,
                    borderRadius: radii.md,
                    padding: spacing.md,
                    borderWidth: 1,
                    borderColor: field.key === 'nickname' && nicknameError ? colors.error : colors.border,
                  }}
                />
                {field.key === 'nickname' && nicknameError ? (
                  <Text style={{ ...typography.caption, color: colors.error, marginTop: spacing.xs }}>
                    {nicknameError}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: spacing.lg, paddingBottom: insets.bottom + spacing.lg,
          backgroundColor: colors.background,
        }}
      >
        <TouchableOpacity
          onPress={handleContinue}
          disabled={loading}
          style={{
            backgroundColor: colors.primary, borderRadius: radii.lg,
            paddingVertical: spacing.md + 2, alignItems: 'center', justifyContent: 'center',
            flexDirection: 'row', gap: spacing.sm,
            opacity: loading ? 0.6 : 1, minHeight: 52,
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={{ ...typography.button, color: colors.onPrimary }}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
