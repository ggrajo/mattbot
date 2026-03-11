import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { apiClient, extractApiError } from '../api/client';

interface ProfileFields {
  display_name: string;
  nickname: string;
  company: string;
  role_title: string;
  timezone: string;
  language: string;
}

const INITIAL: ProfileFields = {
  display_name: '',
  nickname: '',
  company: '',
  role_title: '',
  timezone: '',
  language: '',
};

const FIELD_META: { key: keyof ProfileFields; label: string; icon: string }[] = [
  { key: 'display_name', label: 'Display Name', icon: 'account-outline' },
  { key: 'nickname', label: 'Nickname', icon: 'tag-outline' },
  { key: 'company', label: 'Company', icon: 'office-building-outline' },
  { key: 'role_title', label: 'Role Title', icon: 'briefcase-outline' },
  { key: 'timezone', label: 'Timezone', icon: 'clock-outline' },
  { key: 'language', label: 'Language', icon: 'translate' },
];

export function ProfileSettingsScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const navigation = useNavigation();

  const [fields, setFields] = useState<ProfileFields>(INITIAL);
  const [original, setOriginal] = useState<ProfileFields>(INITIAL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError('');
      apiClient
        .get('/me')
        .then((res) => {
          if (!active) return;
          const d = res.data;
          const vals: ProfileFields = {
            display_name: d.display_name ?? '',
            nickname: d.nickname ?? '',
            company: d.company ?? '',
            role_title: d.role_title ?? '',
            timezone: d.timezone ?? '',
            language: d.language ?? '',
          };
          setFields(vals);
          setOriginal(vals);
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
          <View key={key}>
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
            <Text style={{ ...typography.button, color: hasChanges ? colors.onPrimary : colors.textDisabled }}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
