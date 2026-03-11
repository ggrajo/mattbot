import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  FlatList,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemeContext } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { GradientView } from '../components/ui/GradientView';
import { OnboardingProgress } from '../components/ui/OnboardingProgress';
import { apiClient, extractApiError } from '../api/client';
import { getDeviceTimezone } from '../utils/formatDate';

const { width: SCREEN_W } = Dimensions.get('window');

const COMMON_TIMEZONES = [
  'Pacific/Honolulu', 'America/Anchorage', 'America/Los_Angeles', 'America/Denver',
  'America/Chicago', 'America/New_York', 'America/Sao_Paulo', 'Atlantic/Reykjavik',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Africa/Cairo', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok',
  'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Seoul', 'Asia/Manila',
  'Australia/Sydney', 'Pacific/Auckland', 'UTC',
];

function getTimezoneLabel(tz: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' });
    const parts = formatter.formatToParts(now);
    const offset = parts.find(p => p.type === 'timeZoneName')?.value || '';
    const city = tz.split('/').pop()?.replace(/_/g, ' ') || tz;
    return `${city} (${offset})`;
  } catch {
    return tz;
  }
}

function resolveDeviceTimezone(): string {
  const detected = getDeviceTimezone();
  if (detected && detected !== 'GMT' && (detected.includes('/') || detected === 'UTC')) {
    return detected;
  }
  return 'UTC';
}

const LANGUAGES = [
  { label: 'English', code: 'en' },
  { label: 'Spanish', code: 'es' },
  { label: 'French', code: 'fr' },
  { label: 'German', code: 'de' },
  { label: 'Portuguese', code: 'pt' },
  { label: 'Japanese', code: 'ja' },
  { label: 'Filipino', code: 'fil' },
];

const THEME_OPTIONS: Array<{ label: string; value: 'light' | 'dark' | 'system'; icon: string }> = [
  { label: 'Light', value: 'light', icon: 'white-balance-sunny' },
  { label: 'Dark', value: 'dark', icon: 'moon-waning-crescent' },
  { label: 'System', value: 'system', icon: 'cellphone' },
];

export function OnboardingSettingsScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const { themeMode, setThemeMode } = useThemeContext();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState<number>(1);
  const [timezone, setTimezone] = useState(resolveDeviceTimezone);
  const [languageCode, setLanguageCode] = useState('en');
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>(themeMode);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);
  const [tzSearch, setTzSearch] = useState('');

  const filteredTimezones = useMemo(() => {
    if (!tzSearch.trim()) return COMMON_TIMEZONES;
    const q = tzSearch.toLowerCase();
    return COMMON_TIMEZONES.filter(
      tz => tz.toLowerCase().includes(q) || getTimezoneLabel(tz).toLowerCase().includes(q),
    );
  }, [tzSearch]);

  useEffect(() => {
    apiClient.get('/settings').then(({ data }) => {
      setRevision(data.revision ?? 1);
      if (data.timezone) setTimezone(data.timezone);
      if (data.language_primary) setLanguageCode(data.language_primary);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setSelectedTheme(themeMode);
  }, [themeMode]);

  const selectedLanguage = LANGUAGES.find(l => l.code === languageCode) || LANGUAGES[0];

  function handleThemeSelect(value: 'light' | 'dark' | 'system') {
    setSelectedTheme(value);
    setThemeMode(value);
  }

  async function handleContinue() {
    setLoading(true);
    try {
      await apiClient.patch('/settings', {
        expected_revision: revision,
        changes: {
          timezone,
          language_primary: languageCode,
          theme_preference: selectedTheme,
        },
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
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <GradientView
          colors={[theme.dark ? 'rgba(129,140,248,0.10)' : 'rgba(129,140,248,0.05)', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', top: -SCREEN_W * 0.3, left: -SCREEN_W * 0.1, width: SCREEN_W, height: SCREEN_W, borderRadius: SCREEN_W * 0.5 }}
        />
      </View>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: spacing.lg,
          paddingBottom: insets.bottom + 100,
        }}
      >
        <OnboardingProgress currentStep={3} totalSteps={8} />

        <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <View style={{ width: 80, height: 80, borderRadius: 24, overflow: 'hidden' }}>
            <GradientView
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="cog-outline" size={36} color="#FFFFFF" />
            </GradientView>
          </View>
        </View>

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
            backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
            borderWidth: 1,
            borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
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
          <TouchableOpacity
            onPress={() => setShowTimezonePicker(true)}
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
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.body, color: colors.textPrimary }} allowFontScaling>
                {getTimezoneLabel(timezone)}
              </Text>
            </View>
            <Icon name="chevron-down" size="md" color={colors.textDisabled} />
          </TouchableOpacity>
        </View>

        {/* Language */}
        <View
          style={{
            backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
            borderWidth: 1,
            borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
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
              {selectedLanguage.label}
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
                  key={lang.code}
                  onPress={() => {
                    setLanguageCode(lang.code);
                    setShowLanguagePicker(false);
                  }}
                  style={{
                    padding: spacing.md,
                    borderRadius: radii.sm,
                    backgroundColor: languageCode === lang.code ? colors.primaryContainer : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      ...typography.body,
                      color: languageCode === lang.code ? colors.primary : colors.textPrimary,
                      fontWeight: languageCode === lang.code ? '600' : '400',
                    }}
                    allowFontScaling
                  >
                    {lang.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Theme */}
        <View
          style={{
            backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
            borderWidth: 1,
            borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
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

      {/* Timezone Picker - full screen overlay */}
      {showTimezonePicker && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.background,
            zIndex: 100,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingTop: insets.top + spacing.sm,
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              gap: spacing.sm,
            }}
          >
            <TouchableOpacity
              onPress={() => { setShowTimezonePicker(false); setTzSearch(''); }}
              hitSlop={12}
            >
              <Icon name="arrow-left" size="md" color={colors.textPrimary} />
            </TouchableOpacity>
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surface,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: spacing.md,
                gap: spacing.sm,
              }}
            >
              <Icon name="magnify" size="sm" color={colors.textDisabled} />
              <TextInput
                value={tzSearch}
                onChangeText={setTzSearch}
                placeholder="Search timezone..."
                placeholderTextColor={colors.textDisabled}
                autoFocus
                style={{
                  flex: 1,
                  ...typography.body,
                  color: colors.textPrimary,
                  paddingVertical: spacing.sm,
                }}
              />
              {tzSearch.length > 0 && (
                <TouchableOpacity onPress={() => setTzSearch('')} hitSlop={8}>
                  <Icon name="close-circle" size="sm" color={colors.textDisabled} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <FlatList
            data={filteredTimezones}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  setTimezone(item);
                  setShowTimezonePicker(false);
                  setTzSearch('');
                }}
                style={{
                  paddingVertical: spacing.md + 2,
                  paddingHorizontal: spacing.lg,
                  backgroundColor: timezone === item ? colors.primaryContainer : 'transparent',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border + '40',
                }}
              >
                <Text
                  style={{
                    ...typography.body,
                    color: timezone === item ? colors.primary : colors.textPrimary,
                    fontWeight: timezone === item ? '600' : '400',
                  }}
                >
                  {getTimezoneLabel(item)}
                </Text>
                {timezone === item && (
                  <Icon name="check" size="md" color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}
