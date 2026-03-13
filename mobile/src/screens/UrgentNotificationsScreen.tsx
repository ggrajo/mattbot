import React, { useEffect, useState } from 'react';
import { View, Text, Switch } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Toast } from '../components/ui/Toast';
import { SuccessModal } from '../components/ui/SuccessModal';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Divider } from '../components/ui/Divider';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { hapticLight } from '../utils/haptics';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'UrgentNotifications'>;

export function UrgentNotificationsScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;
  const { settings, saving, error, loadSettings, updateSettings } = useSettingsStore();

  const [smsEnabled, setSmsEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [callEnabled, setCallEnabled] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [successModal, setSuccessModal] = useState<{ title: string; message: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings) {
      setSmsEnabled(settings.urgent_notify_sms);
      setEmailEnabled(settings.urgent_notify_email);
      setCallEnabled(settings.urgent_notify_call);
    }
  }, [settings]);

  async function handleSave() {
    const ok = await updateSettings({
      urgent_notify_sms: smsEnabled,
      urgent_notify_email: emailEnabled,
      urgent_notify_call: callEnabled,
    } as any);
    if (ok) {
      setDirty(false);
      setSuccessModal({ title: 'Saved', message: 'Notification settings saved' });
    } else {
      setToast({ message: 'Failed to save settings', type: 'error' });
    }
  }

  const hasPhone = !!settings?.personal_phone_last4;
  const needsPhone = (smsEnabled || callEnabled) && !hasPhone;

  return (
    <ScreenWrapper>
      <Toast
        message={toast?.message ?? ''}
        type={toast?.type}
        visible={!!toast}
        onDismiss={() => setToast(null)}
      />
      <SuccessModal visible={!!successModal} title={successModal?.title ?? ''} message={successModal?.message} onDismiss={() => setSuccessModal(null)} />

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
              immediately through one or more channels. Your phone number and email
              from your profile will be used.
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

      {needsPhone && (
        <Card variant="flat" style={{ marginBottom: spacing.lg, borderColor: colors.warning + '66' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="information-outline" size="md" color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text
                style={{ ...typography.bodySmall, color: colors.warning, fontWeight: '500' }}
                allowFontScaling
              >
                Add your phone number in Profile Settings to enable SMS/call notifications.
              </Text>
              <Text
                style={{ ...typography.caption, color: colors.primary, marginTop: spacing.xs }}
                allowFontScaling
                onPress={() => navigation.navigate('ProfileSettings')}
              >
                Go to Profile Settings →
              </Text>
            </View>
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
