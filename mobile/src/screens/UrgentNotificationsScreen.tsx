import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Switch, TextInput, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';

function ToggleRow({ icon, label, subtitle, value, onValueChange, colors, spacing }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg }}>
      <Icon name={icon} size="md" color={colors.textSecondary} />
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={{ fontSize: 16, color: colors.textPrimary }}>{label}</Text>
        {subtitle && <Text style={{ fontSize: 12, color: colors.textSecondary }}>{subtitle}</Text>}
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.border, true: colors.primary }} />
    </View>
  );
}

interface UrgentSettings {
  urgent_notify_sms: boolean;
  urgent_notify_email: boolean;
  urgent_notify_call: boolean;
  urgent_notify_email_address: string;
  personal_phone_last4: string;
  revision: number;
}

const DEFAULTS: UrgentSettings = {
  urgent_notify_sms: false,
  urgent_notify_email: false,
  urgent_notify_call: false,
  urgent_notify_email_address: '',
  personal_phone_last4: '',
  revision: 1,
};

export function UrgentNotificationsScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const navigation = useNavigation<any>();
  const [settings, setSettings] = useState<UrgentSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError('');
      apiClient
        .get('/settings')
        .then((res) => {
          if (!active) return;
          const d = res.data;
          setSettings({
            urgent_notify_sms: d.urgent_notify_sms ?? DEFAULTS.urgent_notify_sms,
            urgent_notify_email: d.urgent_notify_email ?? DEFAULTS.urgent_notify_email,
            urgent_notify_call: d.urgent_notify_call ?? DEFAULTS.urgent_notify_call,
            urgent_notify_email_address: d.urgent_notify_email_address ?? '',
            personal_phone_last4: d.personal_phone_last4 ?? '',
            revision: d.revision ?? 1,
          });
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

  async function save(changes: Record<string, unknown>) {
    try {
      const res = await apiClient.patch('/settings', {
        expected_revision: settings.revision,
        changes,
      });
      if (res.data?.revision) {
        setSettings((prev) => ({ ...prev, revision: res.data.revision }));
      }
    } catch (err) {
      setError(extractApiError(err));
    }
  }

  function handleToggle(key: 'urgent_notify_sms' | 'urgent_notify_email' | 'urgent_notify_call') {
    const next = !settings[key];
    setSettings((prev) => ({ ...prev, [key]: next }));
    save({ [key]: next }).catch(() => {
      setSettings((prev) => ({ ...prev, [key]: !next }));
    });
  }

  function handleEmailUpdate(email: string) {
    setSettings((prev) => ({ ...prev, urgent_notify_email_address: email }));
  }

  function handleEmailSave() {
    const trimmed = settings.urgent_notify_email_address.trim();
    if (trimmed && !trimmed.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }
    save({ urgent_notify_email_address: trimmed || undefined });
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
          <Text style={{ fontSize: 14, color: colors.error }}>{error}</Text>
        </View>
      ) : null}

      {/* Notification Channels */}
      <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderRadius: radii.md, overflow: 'hidden' }}>
        <View style={{ padding: spacing.lg, paddingBottom: spacing.sm }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary }}>Alert Channels</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
            How you get notified when an urgent call comes in
          </Text>
        </View>
        <ToggleRow
          icon="message-text-outline"
          label="SMS Alert"
          subtitle="Receive a text message for urgent calls"
          value={settings.urgent_notify_sms}
          onValueChange={() => handleToggle('urgent_notify_sms')}
          colors={colors}
          spacing={spacing}
        />
        <View style={{ height: 1, backgroundColor: colors.border, marginLeft: spacing.lg + 20 + spacing.md }} />
        <ToggleRow
          icon="email-outline"
          label="Email Alert"
          subtitle="Receive an email notification for urgent calls"
          value={settings.urgent_notify_email}
          onValueChange={() => handleToggle('urgent_notify_email')}
          colors={colors}
          spacing={spacing}
        />
        <View style={{ height: 1, backgroundColor: colors.border, marginLeft: spacing.lg + 20 + spacing.md }} />
        <ToggleRow
          icon="phone-ring-outline"
          label="Phone Call Alert"
          subtitle="Receive a phone call for urgent matters"
          value={settings.urgent_notify_call}
          onValueChange={() => handleToggle('urgent_notify_call')}
          colors={colors}
          spacing={spacing}
        />
      </View>

      {/* Phone number for SMS/Call alerts */}
      {(settings.urgent_notify_sms || settings.urgent_notify_call) && (
        <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderRadius: radii.md, padding: spacing.lg }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm }}>Alert Phone Number</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md }}>
            SMS and call alerts are sent to your personal phone number
          </Text>
          {settings.personal_phone_last4 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Icon name="phone-check-outline" size="md" color={colors.success} />
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary }}>
                  {'┬╖┬╖┬╖┬╖' + settings.personal_phone_last4}
                </Text>
              </View>
              <Pressable
                onPress={() => navigation.navigate('ProfileSettings')}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  backgroundColor: colors.primary + '15',
                  borderRadius: 20,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>Update in Profile</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => navigation.navigate('ProfileSettings')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                backgroundColor: colors.warning + '15',
                borderRadius: radii.md,
                padding: spacing.md,
                borderWidth: 1,
                borderColor: colors.warning + '30',
              }}
            >
              <Icon name="alert-outline" size="md" color={colors.warning} />
              <Text style={{ fontSize: 13, color: colors.textPrimary, flex: 1 }}>
                No personal phone set. Tap to add one in your Profile.
              </Text>
              <Icon name="chevron-right" size="md" color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      )}

      {/* Email address for email alerts */}
      {settings.urgent_notify_email && (
        <View style={{ marginTop: spacing.lg, marginHorizontal: spacing.lg, backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderRadius: radii.md, padding: spacing.lg }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm }}>Alert Email Address</Text>
          <TextInput
            value={settings.urgent_notify_email_address}
            onChangeText={handleEmailUpdate}
            onBlur={handleEmailSave}
            placeholder="you@example.com"
            placeholderTextColor={colors.textDisabled}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{
              backgroundColor: colors.background,
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.md,
              fontSize: 16,
              color: colors.textPrimary,
            }}
          />
        </View>
      )}
    </ScrollView>
  );
}
