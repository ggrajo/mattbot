import React, { useState, useEffect } from 'react';
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
import { useTheme, useThemeContext } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';
import { getDeviceTimezone } from '../utils/formatDate';

const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Japanese'];
const THEME_OPTIONS: Array<{ label: string; value: 'light' | 'dark' | 'system'; icon: string }> = [
  { label: 'Light', value: 'light', icon: 'white-balance-sunny' },
  { label: 'Dark', value: 'dark', icon: 'moon-waning-crescent' },
  { label: 'System', value: 'system', icon: 'cellphone' },
];

export function OnboardingSettingsScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const { themeMode, setThemeMode } = useThemeContext();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [timezone, setTimezone] = useState(getDeviceTimezone());
  const [language, setLanguage] = useState('English');
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>(themeMode);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  useEffect(() => {
    setSelectedTheme(themeMode);
  }, [themeMode]);

  function handleThemeSelect(value: 'light' | 'dark' | 'system') {
    setSelectedTheme(value);
    setThemeMode(value);
  }

  async function handleContinue() {
    setLoading(true);
    try {
      await apiClient.patch('/settings', {
        timezone,
        language,
        theme_preference: selectedTheme,
      });
      await apiClient.post('/onboarding/complete-step', { step: 'settings_configured' });
      navigation.navigate('OnboardingAssistantSetup' as never);
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
            <Icon name="cog-outline" size="xl" color={colors.primary} />
          </View>
        </View>

        {/* Title & Description */}
        <Text
          style={{ ...typography.h1, color: colors.textPrimary, textAlign: 'center' }}
          allowFontScaling
        >
          Quick Setup
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
          Configure your basic preferences
        </Text>

        {/* Timezone */}
        <View
          style={{
            backgroundColor: colors.surfaceElevated,
            borderRadius: radii.xl,
            padding: spacing.lg,
            marginBottom: spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
            <Icon name="earth" size="md" color={colors.primary} />
            <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }} allowFontScaling>
              Timezone
            </Text>
          </View>
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.md,
              padding: spacing.md,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ ...typography.body, color: colors.textPrimary }} allowFontScaling>
              {timezone}
            </Text>
            <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: 2 }} allowFontScaling>
              Auto-detected from your device
            </Text>
          </View>
        </View>

        {/* Language */}
        <View
          style={{
            backgroundColor: colors.surfaceElevated,
            borderRadius: radii.xl,
            padding: spacing.lg,
            marginBottom: spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
            <Icon name="translate" size="md" color={colors.primary} />
            <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }} allowFontScaling>
              Language
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowLanguagePicker(!showLanguagePicker)}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.md,
              padding: spacing.md,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ ...typography.body, color: colors.textPrimary }} allowFontScaling>
              {language}
            </Text>
            <Icon
              name={showLanguagePicker ? 'chevron-up' : 'chevron-down'}
              size="md"
              color={colors.textDisabled}
            />
          </TouchableOpacity>
          {showLanguagePicker && (
            <View style={{ marginTop: spacing.sm, gap: 2 }}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang}
                  onPress={() => {
                    setLanguage(lang);
                    setShowLanguagePicker(false);
                  }}
                  style={{
                    padding: spacing.md,
                    borderRadius: radii.sm,
                    backgroundColor: language === lang ? colors.primaryContainer : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      ...typography.body,
                      color: language === lang ? colors.primary : colors.textPrimary,
                      fontWeight: language === lang ? '600' : '400',
                    }}
                    allowFontScaling
                  >
                    {lang}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Theme */}
        <View
          style={{
            backgroundColor: colors.surfaceElevated,
            borderRadius: radii.xl,
            padding: spacing.lg,
            marginBottom: spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
            <Icon name="palette-outline" size="md" color={colors.primary} />
            <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }} allowFontScaling>
              Theme
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {THEME_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => handleThemeSelect(opt.value)}
                style={{
                  flex: 1,
                  paddingVertical: spacing.md,
                  borderRadius: radii.md,
                  backgroundColor: selectedTheme === opt.value ? colors.primary : colors.surface,
                  borderWidth: selectedTheme === opt.value ? 0 : 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                  gap: spacing.xs,
                }}
              >
                <Icon
                  name={opt.icon}
                  size="md"
                  color={selectedTheme === opt.value ? colors.onPrimary : colors.textSecondary}
                />
                <Text
                  style={{
                    ...typography.caption,
                    fontWeight: '600',
                    color: selectedTheme === opt.value ? colors.onPrimary : colors.textPrimary,
                  }}
                  allowFontScaling
                >
                  {opt.label}
                </Text>
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
