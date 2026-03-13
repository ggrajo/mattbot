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
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';
import { Icon } from '../components/ui/Icon';
import { Toast } from '../components/ui/Toast';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { BotLoader } from '../components/ui/BotLoader';
import { useTheme } from '../theme/ThemeProvider';
import { apiClient, extractApiError } from '../api/client';
import { useSettingsStore } from '../store/settingsStore';
import { TIMEZONE_SECTIONS, tzLabel, type TimezoneEntry } from '../utils/timezones';
import { RootStackParamList } from '../navigation/types';
import { hapticLight } from '../utils/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileSettings'>;

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
  { flag: '🇺🇸', name: 'United States', dial: '+1', code: 'US' },
  { flag: '🇬🇧', name: 'United Kingdom', dial: '+44', code: 'GB' },
  { flag: '🇨🇦', name: 'Canada', dial: '+1', code: 'CA' },
  { flag: '🇦🇺', name: 'Australia', dial: '+61', code: 'AU' },
  { flag: '🇵🇭', name: 'Philippines', dial: '+63', code: 'PH' },
  { flag: '🇮🇳', name: 'India', dial: '+91', code: 'IN' },
  { flag: '🇩🇪', name: 'Germany', dial: '+49', code: 'DE' },
  { flag: '🇫🇷', name: 'France', dial: '+33', code: 'FR' },
  { flag: '🇮🇹', name: 'Italy', dial: '+39', code: 'IT' },
  { flag: '🇪🇸', name: 'Spain', dial: '+34', code: 'ES' },
  { flag: '🇧🇷', name: 'Brazil', dial: '+55', code: 'BR' },
  { flag: '🇲🇽', name: 'Mexico', dial: '+52', code: 'MX' },
  { flag: '🇯🇵', name: 'Japan', dial: '+81', code: 'JP' },
  { flag: '🇰🇷', name: 'South Korea', dial: '+82', code: 'KR' },
  { flag: '🇨🇳', name: 'China', dial: '+86', code: 'CN' },
  { flag: '🇷🇺', name: 'Russia', dial: '+7', code: 'RU' },
  { flag: '🇳🇱', name: 'Netherlands', dial: '+31', code: 'NL' },
  { flag: '🇸🇪', name: 'Sweden', dial: '+46', code: 'SE' },
  { flag: '🇳🇴', name: 'Norway', dial: '+47', code: 'NO' },
  { flag: '🇩🇰', name: 'Denmark', dial: '+45', code: 'DK' },
  { flag: '🇫🇮', name: 'Finland', dial: '+358', code: 'FI' },
  { flag: '🇵🇱', name: 'Poland', dial: '+48', code: 'PL' },
  { flag: '🇹🇷', name: 'Turkey', dial: '+90', code: 'TR' },
  { flag: '🇸🇦', name: 'Saudi Arabia', dial: '+966', code: 'SA' },
  { flag: '🇦🇪', name: 'UAE', dial: '+971', code: 'AE' },
  { flag: '🇸🇬', name: 'Singapore', dial: '+65', code: 'SG' },
  { flag: '🇲🇾', name: 'Malaysia', dial: '+60', code: 'MY' },
  { flag: '🇮🇩', name: 'Indonesia', dial: '+62', code: 'ID' },
  { flag: '🇹🇭', name: 'Thailand', dial: '+66', code: 'TH' },
  { flag: '🇻🇳', name: 'Vietnam', dial: '+84', code: 'VN' },
  { flag: '🇳🇬', name: 'Nigeria', dial: '+234', code: 'NG' },
  { flag: '🇿🇦', name: 'South Africa', dial: '+27', code: 'ZA' },
  { flag: '🇪🇬', name: 'Egypt', dial: '+20', code: 'EG' },
  { flag: '🇰🇪', name: 'Kenya', dial: '+254', code: 'KE' },
  { flag: '🇦🇷', name: 'Argentina', dial: '+54', code: 'AR' },
  { flag: '🇨🇱', name: 'Chile', dial: '+56', code: 'CL' },
  { flag: '🇨🇴', name: 'Colombia', dial: '+57', code: 'CO' },
  { flag: '🇵🇪', name: 'Peru', dial: '+51', code: 'PE' },
  { flag: '🇮🇱', name: 'Israel', dial: '+972', code: 'IL' },
  { flag: '🇬🇷', name: 'Greece', dial: '+30', code: 'GR' },
  { flag: '🇵🇹', name: 'Portugal', dial: '+351', code: 'PT' },
  { flag: '🇨🇿', name: 'Czech Republic', dial: '+420', code: 'CZ' },
  { flag: '🇷🇴', name: 'Romania', dial: '+40', code: 'RO' },
  { flag: '🇭🇺', name: 'Hungary', dial: '+36', code: 'HU' },
  { flag: '🇺🇦', name: 'Ukraine', dial: '+380', code: 'UA' },
  { flag: '🇮🇪', name: 'Ireland', dial: '+353', code: 'IE' },
  { flag: '🇳🇿', name: 'New Zealand', dial: '+64', code: 'NZ' },
  { flag: '🇧🇪', name: 'Belgium', dial: '+32', code: 'BE' },
  { flag: '🇨🇭', name: 'Switzerland', dial: '+41', code: 'CH' },
  { flag: '🇦🇹', name: 'Austria', dial: '+43', code: 'AT' },
];

function formatPhoneLocal(digits: string, dialCode: string): string {
  if (dialCode === '+1' && digits.length <= 10) {
    const d = digits;
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
  }
  // Generic grouping: xxx xxxx xxxx
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
}

function stripNonDigits(s: string): string {
  return s.replace(/\D/g, '');
}

interface UserProfile {
  display_name: string;
  nickname: string;
  company_name: string;
  role_title: string;
  default_timezone: string;
  language_code: string;
  email: string | null;
}

export function ProfileSettingsScreen({}: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const { settings, loadSettings, updateSettings } = useSettingsStore();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [nickname, setNickname] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [timezone, setTimezone] = useState('');
  const [languageCode, setLanguageCode] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [tzSearch, setTzSearch] = useState('');
  const [countrySearch, setCountrySearch] = useState('');

  useEffect(() => {
    loadProfile();
    loadSettings();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<UserProfile>('/me');
      setProfile(data);
      setDisplayName(data.display_name ?? '');
      setNickname(data.nickname ?? '');
      setCompanyName(data.company_name ?? '');
      setRoleTitle(data.role_title ?? '');
      setTimezone(data.default_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || '');
      setLanguageCode(data.language_code ?? '');
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (settings?.personal_phone_last4) {
      // We only have last 4 so show placeholder; user enters full number to update
    }
  }, [settings]);

  const phoneLast4 = settings?.personal_phone_last4;
  const formattedPhone = formatPhoneLocal(phoneDigits, selectedCountry.dial);
  const fullPhoneE164 = phoneDigits ? `${selectedCountry.dial}${phoneDigits}` : '';

  async function handleSave() {
    setSaving(true);
    try {
      const profilePayload: Record<string, unknown> = {
        display_name: displayName,
        nickname,
        company_name: companyName,
        role_title: roleTitle,
        default_timezone: timezone,
        language_code: languageCode,
      };
      const { data } = await apiClient.patch<UserProfile>('/me', profilePayload);
      setProfile(data);

      if (phoneDigits) {
        await updateSettings({ personal_phone: fullPhoneE164 } as any);
      }

      setDirty(false);
      setToast({ message: 'Profile updated', type: 'success' });
    } catch (e) {
      setToast({ message: extractApiError(e), type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  function handlePhoneChange(text: string) {
    const digits = stripNonDigits(text);
    setPhoneDigits(digits.slice(0, 15));
    setDirty(true);
  }

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

  if (!profile && loading) {
    return (
      <ScreenWrapper scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <BotLoader color={colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  if (!profile && error) {
    return (
      <ScreenWrapper scroll={false}>
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing.xl }}>
          <ErrorMessage message={error} action="Retry" onAction={loadProfile} />
        </View>
      </ScreenWrapper>
    );
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
                    setDirty(true);
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
                  accessibilityLabel={item.label}
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
      <Toast
        message={toast?.message ?? ''}
        type={toast?.type}
        visible={!!toast}
        onDismiss={() => setToast(null)}
      />

      {/* Country Picker Modal */}
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
                    setDirty(true);
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

      <Text
        style={{ ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg }}
        allowFontScaling
      >
        Profile
      </Text>

      {error && (
        <View style={{ marginBottom: spacing.lg }}>
          <ErrorMessage message={error} action="Retry" onAction={loadProfile} />
        </View>
      )}

      <Card style={{ marginBottom: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <TextInput
            label="Display Name"
            value={displayName}
            onChangeText={(v) => { setDisplayName(v); setDirty(true); }}
            placeholder="Your display name"
            leftIcon="account-outline"
          />
          <View style={{ gap: spacing.xs }}>
            <TextInput
              label="Username"
              value={nickname}
              onChangeText={(v) => { setNickname(v.toLowerCase().replace(/[^a-z0-9_]/g, '')); setDirty(true); }}
              placeholder="e.g. katxuyu"
              leftIcon="at"
              autoCapitalize="none"
            />
            <Text style={{ ...typography.caption, color: colors.textDisabled, marginLeft: spacing.xs }} allowFontScaling>
              Lowercase letters, numbers, and underscores only. Must be unique.
            </Text>
          </View>
          <TextInput
            label="Company Name"
            value={companyName}
            onChangeText={(v) => { setCompanyName(v); setDirty(true); }}
            placeholder="Your company"
            leftIcon="office-building-outline"
          />
          <TextInput
            label="Role / Title"
            value={roleTitle}
            onChangeText={(v) => { setRoleTitle(v); setDirty(true); }}
            placeholder="Your role or title"
            leftIcon="briefcase-outline"
          />

          {/* Read-only Email */}
          <View style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon name="email-outline" size="sm" color={colors.textSecondary} />
              <Text style={{ ...typography.bodySmall, color: colors.textSecondary, fontWeight: '500' }} allowFontScaling>
                Email
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: radii.md,
                borderWidth: 1.5,
                borderColor: colors.border,
                backgroundColor: colors.surfaceVariant,
                opacity: 0.7,
              }}
            >
              <Icon name="email-outline" size="sm" color={colors.textDisabled} />
              <Text
                style={{ ...typography.body, color: colors.textSecondary, marginLeft: spacing.sm, flex: 1 }}
                allowFontScaling
                numberOfLines={1}
              >
                {profile?.email ?? '—'}
              </Text>
              <Icon name="lock-outline" size="sm" color={colors.textDisabled} />
            </View>
          </View>

          {/* Phone Number with Country Picker */}
          <View style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon name="phone-outline" size="sm" color={colors.textSecondary} />
              <Text style={{ ...typography.bodySmall, color: colors.textSecondary, fontWeight: '500' }} allowFontScaling>
                Phone Number
              </Text>
              {phoneLast4 && !phoneDigits && (
                <Text style={{ ...typography.caption, color: colors.textDisabled }} allowFontScaling>
                  (••••{phoneLast4} on file)
                </Text>
              )}
            </View>
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
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  placeholder={phoneLast4 ? `Enter to update (••••${phoneLast4})` : 'Phone number'}
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
                    flex: 1,
                  }}
                />
              </View>
            </View>
          </View>

          {/* Language Picker */}
          <View style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon name="translate" size="sm" color={colors.textSecondary} />
              <Text style={{ ...typography.bodySmall, color: colors.textSecondary, fontWeight: '500' }} allowFontScaling>
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
                    onPress={() => { hapticLight(); setLanguageCode(lang.code); setDirty(true); }}
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
                    accessibilityLabel={`${lang.label} language`}
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
        </View>
      </Card>

      <Card style={{ marginBottom: spacing.xl }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Icon name="earth" size="md" color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '500' }} allowFontScaling>
                Timezone
              </Text>
              <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                Used for scheduling and quiet hours
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
            accessibilityLabel="Select timezone"
          >
            <Text
              style={{
                ...typography.body,
                color: timezone ? colors.textPrimary : colors.textDisabled,
              }}
              allowFontScaling
            >
              {timezone ? tzLabel(timezone) : 'Select timezone'}
            </Text>
            <Icon name="chevron-right" size="md" color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </Card>

      <Button
        title="Save Changes"
        onPress={handleSave}
        loading={saving}
        disabled={!dirty}
        icon="content-save-outline"
      />
    </ScreenWrapper>
  );
}
