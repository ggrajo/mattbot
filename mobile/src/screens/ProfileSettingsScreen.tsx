import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { PhoneInput } from '../components/ui/PhoneInput';
import { apiClient, extractApiError } from '../api/client';
import { useAuthStore } from '../store/authStore';

interface ProfileFields {
  display_name: string;
  nickname: string;
  company_name: string;
  role_title: string;
}

const INITIAL: ProfileFields = {
  display_name: '',
  nickname: '',
  company_name: '',
  role_title: '',
};

const FIELD_META: { key: keyof ProfileFields; label: string; icon: string }[] = [
  { key: 'display_name', label: 'Display Name', icon: 'account-outline' },
  { key: 'nickname', label: 'Nickname', icon: 'tag-outline' },
  { key: 'company_name', label: 'Company', icon: 'office-building-outline' },
  { key: 'role_title', label: 'Role Title', icon: 'briefcase-outline' },
];

export function ProfileSettingsScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const navigation = useNavigation();
  const setProfileName = useAuthStore(s => s.setProfileName);

  const [fields, setFields] = useState<ProfileFields>(INITIAL);
  const [original, setOriginal] = useState<ProfileFields>(INITIAL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [personalPhone, setPersonalPhone] = useState('');
  const [personalPhoneLast4, setPersonalPhoneLast4] = useState('');
  const [settingsRevision, setSettingsRevision] = useState(1);
  const [phoneSaving, setPhoneSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError('');
      Promise.all([apiClient.get('/me'), apiClient.get('/settings')])
        .then(([meRes, settingsRes]) => {
          if (!active) return;
          const d = meRes.data;
          const vals: ProfileFields = {
            display_name: d.display_name ?? '',
            nickname: d.nickname ?? '',
            company_name: d.company_name ?? '',
            role_title: d.role_title ?? '',
          };
          setFields(vals);
          setOriginal(vals);

          const s = settingsRes.data;
          setPersonalPhoneLast4(s.personal_phone_last4 ?? '');
          setSettingsRevision(s.revision ?? 1);
        })
        .catch((err) => {
          if (active) setError(extractApiError(err));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => { active = false; };
    }, []),
  );

  const hasChanges = JSON.stringify(fields) !== JSON.stringify(original);

  async function handlePhoneSave() {
    const clean = personalPhone.replace(/[^+\d]/g, '');
    if (clean && !/^\+[1-9]\d{1,14}$/.test(clean)) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number with country code (e.g. +1...)');
      return;
    }
    setPhoneSaving(true);
    try {
      const res = await apiClient.patch('/settings', {
        expected_revision: settingsRevision,
        changes: { personal_phone: clean || null },
      });
      if (res.data?.revision) setSettingsRevision(res.data.revision);
      setPersonalPhoneLast4(clean ? clean.slice(-4) : '');
      setPersonalPhone('');
      Alert.alert('Saved', 'Personal phone updated.');
    } catch (err) {
      Alert.alert('Error', extractApiError(err) || 'Failed to save phone');
    } finally {
      setPhoneSaving(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const changed: Partial<ProfileFields> = {};
      for (const k of Object.keys(fields) as (keyof ProfileFields)[]) {
        if (fields[k] !== original[k]) changed[k] = fields[k];
      }
      await apiClient.patch('/me', changed);
      setOriginal(fields);
      setProfileName(fields.display_name || null, fields.nickname || null);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      keyboardShouldPersistTaps="handled"
    >
      {error ? (
        <View style={{ padding: spacing.lg }}>
          <Text style={{ ...typography.body, color: colors.error }}>{error}</Text>
        </View>
      ) : null}

      <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, gap: spacing.md }}>
        {FIELD_META.map(({ key, label }) => (
          <View
            key={key}
            style={{
              backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
              borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
              borderRadius: radii.md,
              padding: spacing.lg,
              borderWidth: 1,
            }}
          >
            <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs }}>{label}</Text>
            <TextInput
              value={fields[key]}
              onChangeText={(v) => setFields((prev) => ({ ...prev, [key]: v }))}
              placeholder={label}
              placeholderTextColor={colors.textDisabled}
              style={{
                ...typography.body,
                color: colors.textPrimary,
                backgroundColor: colors.surface,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.border,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
              }}
            />
          </View>
        ))}
      </View>

      {/* Personal Phone Section */}
      <View style={{ marginTop: spacing.xl, marginHorizontal: spacing.lg }}>
        <View
          style={{
            backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
            borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
            borderRadius: radii.md,
            padding: spacing.lg,
            borderWidth: 1,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
            <Icon name="phone-outline" size="md" color={colors.primary} />
            <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}>Personal Phone</Text>
          </View>
          <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md }}>
            Used for urgent SMS/call alerts from your AI assistant
          </Text>
          {personalPhoneLast4 ? (
            <Text style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.sm }}>
              Current: {'┬╖┬╖┬╖┬╖' + personalPhoneLast4}
            </Text>
          ) : null}
          <PhoneInput
            value={personalPhone}
            onChangeValue={setPersonalPhone}
            label=""
            placeholder={personalPhoneLast4 ? 'Enter new number to update' : '+1 (555) 123-4567'}
          />
          <TouchableOpacity
            onPress={handlePhoneSave}
            disabled={phoneSaving || !personalPhone.trim()}
            style={{
              alignSelf: 'flex-end',
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm,
              backgroundColor: personalPhone.trim() ? colors.primary : colors.border,
              borderRadius: 20,
              marginTop: spacing.sm,
              opacity: phoneSaving ? 0.6 : 1,
            }}
          >
            {phoneSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={{ fontSize: 13, fontWeight: '700', color: personalPhone.trim() ? '#FFFFFF' : colors.textDisabled }}>
                {personalPhoneLast4 ? 'Update Phone' : 'Save Phone'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ marginTop: spacing.xl, marginHorizontal: spacing.lg }}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!hasChanges || saving}
          style={{
            backgroundColor: hasChanges ? colors.primary : colors.border,
            borderRadius: radii.md,
            paddingVertical: spacing.md,
            alignItems: 'center',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={{ ...typography.button, color: hasChanges ? colors.onPrimary : colors.textDisabled }}>Save Profile</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
