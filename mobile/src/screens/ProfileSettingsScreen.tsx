import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SectionList,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';
import { Icon } from '../components/ui/Icon';
import { Toast } from '../components/ui/Toast';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useTheme } from '../theme/ThemeProvider';
import { apiClient, extractApiError } from '../api/client';
import { TIMEZONE_SECTIONS, tzLabel, type TimezoneEntry } from '../utils/timezones';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileSettings'>;

interface UserProfile {
  display_name: string;
  nickname: string;
  company_name: string;
  role_title: string;
  default_timezone: string;
  language_code: string;
}

export function ProfileSettingsScreen({}: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [nickname, setNickname] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [timezone, setTimezone] = useState('');
  const [languageCode, setLanguageCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);
  const [tzSearch, setTzSearch] = useState('');

  useEffect(() => {
    loadProfile();
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

  async function handleSave() {
    setSaving(true);
    try {
      const { data } = await apiClient.patch<UserProfile>('/me', {
        display_name: displayName,
        nickname,
        company_name: companyName,
        role_title: roleTitle,
        default_timezone: timezone,
        language_code: languageCode,
      });
      setProfile(data);
      setDirty(false);
      setToast({ message: 'Profile updated', type: 'success' });
    } catch (e) {
      setToast({ message: extractApiError(e), type: 'error' });
    } finally {
      setSaving(false);
    }
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

  if (!profile && loading) {
    return (
      <ScreenWrapper scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
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
          <TextInput
            label="Nickname"
            value={nickname}
            onChangeText={(v) => { setNickname(v); setDirty(true); }}
            placeholder="Optional nickname"
            leftIcon="tag-outline"
          />
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
          <TextInput
            label="Language Code"
            value={languageCode}
            onChangeText={(v) => { setLanguageCode(v); setDirty(true); }}
            placeholder="en"
            leftIcon="translate"
          />
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
