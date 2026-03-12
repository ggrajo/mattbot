import React, { useEffect, useState } from 'react';
import { View, Text, Switch } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';
import { Icon } from '../components/ui/Icon';
import { Toast } from '../components/ui/Toast';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Divider } from '../components/ui/Divider';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { hapticLight } from '../utils/haptics';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'UrgentNotifications'>;

export function UrgentNotificationsScreen({}: Props) {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;
  const { settings, error, loadSettings, updateSettings } = useSettingsStore();

  const [smsEnabled, setSmsEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [callEnabled, setCallEnabled] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      setSmsEnabled(settings.urgent_notify_sms);
      setEmailEnabled(settings.urgent_notify_email);
      setCallEnabled(settings.urgent_notify_call);
      // Don't populate phone from last4 - user must enter full number to avoid corrupting data
      setEmail(settings.urgent_notify_email_address ?? '');
    }
  }, [settings]);

  const showPhoneInput = smsEnabled || callEnabled;
  const showEmailInput = emailEnabled;

  async function handleSave() {
    setSaving(true);
    try {
      const changes: Record<string, unknown> = {
        urgent_notify_sms: smsEnabled,
        urgent_notify_email: emailEnabled,
        urgent_notify_call: callEnabled,
      };
      if (showPhoneInput) changes.urgent_notify_phone = phone;
      if (showEmailInput) changes.urgent_notify_email_address = email;

      const ok = await updateSettings(changes as any);
      if (ok) {
        setDirty(false);
        setToast({ message: 'Notification settings saved', type: 'success' });
      } else {
        setToast({ message: 'Failed to save settings', type: 'error' });
      }
    } finally {
      setSaving(false);
    }
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
        Urgent Notifications
      </Text>

      {error && (
        <View style={{ marginBottom: spacing.lg }}>
          <ErrorMessage message={error} action="Retry" onAction={loadSettings} />
        </View>
      )}

      <Card variant="flat" style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Icon name="alert-circle-outline" size="lg" color={colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.bodySmall, color: colors.textSecondary, lineHeight: 20 }} allowFontScaling>
              When the AI assistant determines a call is urgent, it can notify you
              immediately through one or more channels. Configure which channels
              to use below.
            </Text>
          </View>
        </View>
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="bell-ring-outline" size="md" color={colors.primary} />
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              Notification Channels
            </Text>
          </View>

          <Divider />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
              <Icon name="message-text-outline" size="md" color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '500' }} allowFontScaling>
                  SMS
                </Text>
                <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                  Receive a text message for urgent calls
                </Text>
              </View>
            </View>
            <Switch
              value={smsEnabled}
              onValueChange={(v) => { hapticLight(); setSmsEnabled(v); setDirty(true); }}
              trackColor={{ false: colors.surfaceVariant, true: colors.primary + '66' }}
              thumbColor={smsEnabled ? colors.primary : colors.textDisabled}
            />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
              <Icon name="email-outline" size="md" color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '500' }} allowFontScaling>
                  Email
                </Text>
                <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                  Get an email notification for urgent calls
                </Text>
              </View>
            </View>
            <Switch
              value={emailEnabled}
              onValueChange={(v) => { hapticLight(); setEmailEnabled(v); setDirty(true); }}
              trackColor={{ false: colors.surfaceVariant, true: colors.primary + '66' }}
              thumbColor={emailEnabled ? colors.primary : colors.textDisabled}
            />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
              <Icon name="phone-outline" size="md" color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '500' }} allowFontScaling>
                  Phone Call
                </Text>
                <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                  Receive a call back for urgent matters
                </Text>
              </View>
            </View>
            <Switch
              value={callEnabled}
              onValueChange={(v) => { hapticLight(); setCallEnabled(v); setDirty(true); }}
              trackColor={{ false: colors.surfaceVariant, true: colors.primary + '66' }}
              thumbColor={callEnabled ? colors.primary : colors.textDisabled}
            />
          </View>
        </View>
      </Card>

      {showPhoneInput && (
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Icon name="phone-outline" size="md" color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '500' }} allowFontScaling>
                  Phone Number
                </Text>
                <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                  {settings?.urgent_notify_phone_last4
                    ? 'Enter full phone number (••••' + settings.urgent_notify_phone_last4 + ' on file)'
                    : 'Used for SMS and call-back notifications'}
                </Text>
              </View>
            </View>
            <TextInput
              label="Phone Number"
              value={phone}
              onChangeText={(v) => { setPhone(v); setDirty(true); }}
              keyboardType="phone-pad"
              leftIcon="phone-outline"
              placeholder="+1 (555) 123-4567"
            />
          </View>
        </Card>
      )}

      {showEmailInput && (
        <Card style={{ marginBottom: spacing.lg }}>
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Icon name="email-outline" size="md" color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '500' }} allowFontScaling>
                  Email Address
                </Text>
                <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                  Used for urgent email notifications
                </Text>
              </View>
            </View>
            <TextInput
              label="Email Address"
              value={email}
              onChangeText={(v) => { setEmail(v); setDirty(true); }}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="email-outline"
              placeholder="you@example.com"
            />
          </View>
        </Card>
      )}

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
