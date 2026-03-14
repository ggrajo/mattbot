import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  ScrollView,
  Modal,
  FlatList,
  TextInput as RNTextInput,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { TextInput } from '../components/ui/TextInput';
import { Icon } from '../components/ui/Icon';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { BotLoader } from '../components/ui/BotLoader';
import { Toast } from '../components/ui/Toast';
import { FadeIn } from '../components/ui/FadeIn';
import { OnboardingProgress } from '../components/onboarding/OnboardingProgress';
import { useTheme } from '../theme/ThemeProvider';
import { apiClient, extractApiError } from '../api/client';
import { useSettingsStore } from '../store/settingsStore';
import { TIMEZONE_SECTIONS, tzLabel, type TimezoneEntry } from '../utils/timezones';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OnboardingSettings'>;

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'nl', label: 'Dutch' },
  { code: 'ru', label: 'Russian' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
  { code: 'tl', label: 'Filipino' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'th', label: 'Thai' },
  { code: 'tr', label: 'Turkish' },
  { code: 'pl', label: 'Polish' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'sv', label: 'Swedish' },
  { code: 'da', label: 'Danish' },
  { code: 'no', label: 'Norwegian' },
  { code: 'fi', label: 'Finnish' },
  { code: 'el', label: 'Greek' },
  { code: 'he', label: 'Hebrew' },
  { code: 'id', label: 'Indonesian' },
  { code: 'ms', label: 'Malay' },
  { code: 'cs', label: 'Czech' },
  { code: 'ro', label: 'Romanian' },
  { code: 'hu', label: 'Hungarian' },
];

interface CountryCode {
  flag: string;
  name: string;
  dial: string;
  code: string;
}

const COUNTRY_CODES: CountryCode[] = [
  { flag: '\u{1F1FA}\u{1F1F8}', name: 'United States', dial: '+1', code: 'US' },
  { flag: '\u{1F1EC}\u{1F1E7}', name: 'United Kingdom', dial: '+44', code: 'GB' },
  { flag: '\u{1F1E8}\u{1F1E6}', name: 'Canada', dial: '+1', code: 'CA' },
  { flag: '\u{1F1E6}\u{1F1FA}', name: 'Australia', dial: '+61', code: 'AU' },
  { flag: '\u{1F1F5}\u{1F1ED}', name: 'Philippines', dial: '+63', code: 'PH' },
  { flag: '\u{1F1EE}\u{1F1F3}', name: 'India', dial: '+91', code: 'IN' },
  { flag: '\u{1F1E9}\u{1F1EA}', name: 'Germany', dial: '+49', code: 'DE' },
  { flag: '\u{1F1EB}\u{1F1F7}', name: 'France', dial: '+33', code: 'FR' },
  { flag: '\u{1F1EE}\u{1F1F9}', name: 'Italy', dial: '+39', code: 'IT' },
  { flag: '\u{1F1EA}\u{1F1F8}', name: 'Spain', dial: '+34', code: 'ES' },
  { flag: '\u{1F1E7}\u{1F1F7}', name: 'Brazil', dial: '+55', code: 'BR' },
  { flag: '\u{1F1F2}\u{1F1FD}', name: 'Mexico', dial: '+52', code: 'MX' },
  { flag: '\u{1F1EF}\u{1F1F5}', name: 'Japan', dial: '+81', code: 'JP' },
  { flag: '\u{1F1F0}\u{1F1F7}', name: 'South Korea', dial: '+82', code: 'KR' },
  { flag: '\u{1F1F8}\u{1F1EC}', name: 'Singapore', dial: '+65', code: 'SG' },
];

function formatPhoneLocal(digits: string, dialCode: string): string {
  if (dialCode === '+1' && digits.length <= 10) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
}

function stripNonDigits(s: string): string {
  return s.replace(/\D/g, '');
}

export function OnboardingSettingsScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const { completeStep, updateSettings } = useSettingsStore();

  const [displayName, setDisplayName] = useState('');
  const [nickname, setNickname] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  );
  const [languageCode, setLanguageCode] = useState('en');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [saving, setSaving] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [tzSearch, setTzSearch] = useState('');
  const [countrySearch, setCountrySearch] = useState('');

  const formattedPhone = formatPhoneLocal(phoneDigits, selectedCountry.dial);
  const fullPhoneE164 = phoneDigits ? `${selectedCountry.dial}${phoneDigits}` : '';

  const filteredSections = tzSearch.trim()
    ? TIMEZONE_SECTIONS.map((s) => ({
        ...s,
        data: s.data.filter(
          (tz) =>
            tz.label.toLowerCase().includes(tzSearch.toLowerCase()) ||
            tz.value.toLowerCase().includes(tzSearch.toLowerCase()),
        ),
      })).filter((s) => s.data.length > 0)
    : TIMEZONE_SECTIONS;

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return COUNTRY_CODES;
    const q = countrySearch.toLowerCase();
    return COUNTRY_CODES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [countrySearch]);

  async function handleContinue() {
    setSaving(true);
    setStepError(null);
    try {
      const profilePayload: Record<string, unknown> = {
        display_name: displayName || undefined,
        nickname: nickname || undefined,
        company_name: companyName || undefined,
        role_title: roleTitle || undefined,
        default_timezone: timezone,
        language_code: languageCode,
      };
      await apiClient.patch('/me', profilePayload);

      const settingsPayload: Record<string, unknown> = {};
      if (fullPhoneE164) settingsPayload.personal_phone = fullPhoneE164;
      if (Object.keys(settingsPayload).length > 0) {
        await updateSettings(settingsPayload);
      }

      const { useAuthStore } = await import('../store/authStore');
      useAuthStore.getState().loadProfile();

      const ok = await completeStep('settings_configured');
      if (ok) {
        hapticMedium();
        navigation.navigate('OnboardingPrivacy');
        return;
      }
      setStepError('Failed to save. Please try again.');
    } catch (e) {
      setStepError(extractApiError(e));
    } finally {
      setSaving(false);
    }
  }

  if (showTimezonePicker) {
    return (
      <ScreenWrapper scroll={false}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: spacing.md }}>
            <TouchableOpacity onPress={() => setShowTimezonePicker(false)} accessibilityLabel="Back">
              <Icon name="arrow-left" size="md" color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={{ ...typography.h2, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              Select Timezone
            </Text>
          </View>
          <TextInput
            label="Search"
            value={tzSearch}
            onChangeText={setTzSearch}
            placeholder="Search timezones..."
            leftIcon="magnify"
            containerStyle={{ marginBottom: spacing.sm }}
          />
          <SectionList
            sections={filteredSections}
            keyExtractor={(item) => item.value}
            renderSectionHeader={({ section }) => (
              <Text
                style={{
                  ...typography.bodySmall,
                  color: colors.textSecondary,
                  fontWeight: '600',
                  paddingVertical: spacing.sm,
                  backgroundColor: colors.background,
                }}
                allowFontScaling
              >
                {section.title}
              </Text>
            )}
            renderItem={({ item }: { item: TimezoneEntry }) => {
              const selected = timezone === item.value;
              return (
                <TouchableOpacity
                  onPress={() => {
                    setTimezone(item.value);
                    setShowTimezonePicker(false);
                    setTzSearch('');
                  }}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.md,
                    borderRadius: radii.md,
                    backgroundColor: selected ? colors.primary + '14' : 'transparent',
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: selected ? '600' : '400' }} allowFontScaling>
                      {item.label}
                    </Text>
                    <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                      {item.offset}
                    </Text>
                  </View>
                  {selected && <Icon name="check" size="md" color={colors.primary} />}
                </TouchableOpacity>
              );
            }}
            stickySectionHeadersEnabled
          />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Toast message={toast} type="success" visible={!!toast} onDismiss={() => setToast('')} />

      <Modal visible={showCountryPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: spacing.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.md }}>
            <TouchableOpacity onPress={() => { setShowCountryPicker(false); setCountrySearch(''); }}>
              <Icon name="close" size="md" color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={{ ...typography.h2, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              Select Country
            </Text>
          </View>
          <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
            <RNTextInput
              value={countrySearch}
              onChangeText={setCountrySearch}
              placeholder="Search countries..."
              placeholderTextColor={colors.textDisabled}
              style={{
                ...typography.body,
                color: colors.textPrimary,
                backgroundColor: colors.surface,
                borderRadius: radii.md,
                borderWidth: 1.5,
                borderColor: colors.border,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              }}
              autoFocus
            />
          </View>
          <FlatList
            data={filteredCountries}
            keyExtractor={(c) => c.code}
            contentContainerStyle={{ paddingHorizontal: spacing.lg }}
            renderItem={({ item }) => {
              const selected = selectedCountry.code === item.code;
              return (
                <TouchableOpacity
                  onPress={() => {
                    hapticLight();
                    setSelectedCountry(item);
                    setShowCountryPicker(false);
                    setCountrySearch('');
                  }}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.sm,
                    borderRadius: radii.md,
                    backgroundColor: selected ? colors.primary + '14' : 'transparent',
                    gap: spacing.md,
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{item.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: selected ? '600' : '400' }} allowFontScaling>
                      {item.name}
                    </Text>
                  </View>
                  <Text style={{ ...typography.body, color: colors.textSecondary }}>{item.dial}</Text>
                  {selected && <Icon name="check" size="md" color={colors.primary} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      <OnboardingProgress currentStep={1} totalSteps={6} label="Profile Setup" />

      <FadeIn delay={0} slide="up">
        <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: radii.xl,
              backgroundColor: colors.primary + '14',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.lg,
            }}
          >
            <Icon name="account-circle-outline" size={36} color={colors.primary} />
          </View>
          <Text style={{ ...typography.h2, color: colors.textPrimary, textAlign: 'center' }} allowFontScaling>
            Set Up Your Profile
          </Text>
          <Text
            style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }}
            allowFontScaling
          >
            Tell us about yourself so your AI assistant can greet callers properly.
          </Text>
        </View>
      </FadeIn>

      {stepError && (
        <View style={{ marginBottom: spacing.lg }}>
          <ErrorMessage message={stepError} />
        </View>
      )}

      <FadeIn delay={60}>
        <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
          <View style={{ gap: spacing.sm }}>
            <TextInput
              label="Display Name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your full name"
              leftIcon="account-outline"
              autoCapitalize="words"
            />
            <View style={{ gap: spacing.xs }}>
              <TextInput
                label="Username"
                value={nickname}
                onChangeText={(v) => setNickname(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="e.g. matt_bot"
                leftIcon="at"
                autoCapitalize="none"
              />
              <Text style={{ ...typography.caption, color: colors.textDisabled, marginLeft: spacing.xs }} allowFontScaling>
                Lowercase letters, numbers, and underscores only.
              </Text>
            </View>
            <TextInput
              label="Company Name"
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="Your company (optional)"
              leftIcon="office-building-outline"
            />
            <TextInput
              label="Role / Title"
              value={roleTitle}
              onChangeText={setRoleTitle}
              placeholder="Your role (optional)"
              leftIcon="briefcase-outline"
            />
          </View>
        </Card>
      </FadeIn>

      <FadeIn delay={120}>
        <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon name="phone-outline" size="md" color={colors.primary} />
              <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
                Your Phone Number
              </Text>
            </View>
            <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
              For live call handoff and urgent alerts. You can update this later.
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <TouchableOpacity
                onPress={() => setShowCountryPicker(true)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.sm,
                  borderRadius: radii.md,
                  borderWidth: 1.5,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  minWidth: 90,
                }}
              >
                <Text style={{ fontSize: 20 }}>{selectedCountry.flag}</Text>
                <Text style={{ ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' }}>{selectedCountry.dial}</Text>
                <Icon name="chevron-down" size="sm" color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <RNTextInput
                  value={formattedPhone}
                  onChangeText={(t) => setPhoneDigits(stripNonDigits(t).slice(0, 15))}
                  keyboardType="phone-pad"
                  placeholder="Phone number"
                  placeholderTextColor={colors.textDisabled}
                  style={{
                    ...typography.body,
                    color: colors.textPrimary,
                    backgroundColor: colors.surface,
                    borderRadius: radii.md,
                    borderWidth: 1.5,
                    borderColor: colors.border,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                  }}
                />
              </View>
            </View>
          </View>
        </Card>
      </FadeIn>

      <FadeIn delay={180}>
        <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon name="translate" size="md" color={colors.primary} />
              <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
                Language
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.xs, paddingVertical: spacing.xs }}
            >
              {LANGUAGES.map((lang) => {
                const selected = languageCode === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => { hapticLight(); setLanguageCode(lang.code); }}
                    activeOpacity={0.7}
                    style={{
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.md,
                      borderRadius: radii.full,
                      borderWidth: 1.5,
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary + '14' : 'transparent',
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                  >
                    <Text
                      style={{
                        ...typography.bodySmall,
                        color: selected ? colors.primary : colors.textPrimary,
                        fontWeight: selected ? '600' : '400',
                      }}
                      allowFontScaling
                    >
                      {lang.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Card>
      </FadeIn>

      <FadeIn delay={240}>
        <Card variant="elevated" style={{ marginBottom: spacing.xl }}>
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Icon name="earth" size="md" color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.h3, color: colors.textPrimary }} allowFontScaling>
                  Timezone
                </Text>
                <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                  For scheduling and quiet hours
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setShowTimezonePicker(true)}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                borderRadius: radii.md,
                borderWidth: 1.5,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              }}
            >
              <Text style={{ ...typography.body, color: colors.textPrimary }} allowFontScaling>
                {tzLabel(timezone)}
              </Text>
              <Icon name="chevron-right" size="md" color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </Card>
      </FadeIn>

      <FadeIn delay={300}>
        <Button
          title="Continue"
          icon="arrow-right"
          onPress={handleContinue}
          loading={saving}
          disabled={saving}
        />
      </FadeIn>
    </ScreenWrapper>
  );
}
