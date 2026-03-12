import React, { useEffect, useState } from 'react';
import { View, Text, Switch, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Toast } from '../components/ui/Toast';
import { Divider } from '../components/ui/Divider';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { useBiometric } from '../hooks/useBiometric';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacySettings'>;

export function PrivacySettingsScreen({}: Props) {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;
  const { settings, loading, error, loadSettings, updateSettings } = useSettingsStore();
  const { available: biometricAvailable, biometryType, loading: biometricLoading } = useBiometric();
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    loadSettings();
  }, []);

  async function handleToggle(key: string, value: boolean | string) {
    const ok = await updateSettings({ [key]: value });
    if (ok) {
      setToastType('success');
      setToast('Settings saved');
    } else {
      setToastType('error');
      setToast(useSettingsStore.getState().error ?? 'Failed to save setting.');
    }
  }

  if (!settings && loading) {
    return (
      <ScreenWrapper scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  if (!settings && error) {
    return (
      <ScreenWrapper scroll={false}>
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing.xl }}>
          <ErrorMessage message={error} action="Retry" onAction={loadSettings} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Toast message={toast} type={toastType} visible={!!toast} onDismiss={() => setToast('')} />

      {error && <ErrorMessage message={error} action="Retry" onAction={loadSettings} />}

      {/* Notification Privacy Mode */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="bell-outline" size="md" color={colors.primary} />
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              Notification Privacy
            </Text>
          </View>
          <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
            Choose how much detail appears in your push notifications.
          </Text>

          <Divider />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '500' }} allowFontScaling>
                Private
              </Text>
              <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                Shows "New activity" only
              </Text>
            </View>
            <Switch
              value={settings?.notification_privacy_mode === 'private'}
              onValueChange={() => handleToggle('notification_privacy_mode', 'private')}
              trackColor={{ false: colors.border, true: colors.primary }}
              accessibilityLabel="Private mode"
              accessibilityRole="radio"
              accessibilityState={{ checked: settings?.notification_privacy_mode === 'private' }}
            />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '500' }} allowFontScaling>
                Preview
              </Text>
              <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                Shows limited preview text
              </Text>
            </View>
            <Switch
              value={settings?.notification_privacy_mode === 'preview'}
              onValueChange={() => handleToggle('notification_privacy_mode', 'preview')}
              trackColor={{ false: colors.border, true: colors.primary }}
              accessibilityLabel="Preview mode"
              accessibilityRole="radio"
              accessibilityState={{ checked: settings?.notification_privacy_mode === 'preview' }}
            />
          </View>
        </View>
      </Card>

      {/* Biometric Unlock */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg, opacity: biometricAvailable ? 1 : 0.5 }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon
              name={biometryType === 'FaceID' ? 'face-recognition' : 'fingerprint'}
              size="md"
              color={biometricAvailable ? colors.primary : colors.textDisabled}
            />
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              {biometryType === 'FaceID' ? 'Face ID' : biometryType === 'TouchID' ? 'Touch ID' : 'Biometric Unlock'}
            </Text>
          </View>
          {biometricAvailable ? (
            <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
              Require {biometryType === 'FaceID' ? 'Face ID' : biometryType === 'TouchID' ? 'Touch ID' : 'biometric'} authentication to view sensitive content like transcripts and recordings.
            </Text>
          ) : (
            <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
              {biometricLoading
                ? 'Checking biometric availability...'
                : 'Biometric authentication is not available on this device. To use this feature, set up biometrics in your device settings.'}
            </Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text
              style={{
                ...typography.body,
                color: biometricAvailable ? colors.textPrimary : colors.textDisabled,
              }}
              allowFontScaling
            >
              Enable biometric lock
            </Text>
            <Switch
              value={biometricAvailable ? (settings?.biometric_unlock_enabled ?? false) : false}
              onValueChange={v => handleToggle('biometric_unlock_enabled', v)}
              disabled={!biometricAvailable}
              trackColor={{ false: colors.border, true: colors.primary }}
              accessibilityLabel="Enable biometric unlock"
              accessibilityRole="switch"
              accessibilityState={{
                checked: biometricAvailable ? (settings?.biometric_unlock_enabled ?? false) : false,
                disabled: !biometricAvailable,
              }}
            />
          </View>
        </View>
      </Card>

      {/* Recording */}
      <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Icon name="microphone-outline" size="md" color={colors.warning} />
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              Call Recording
            </Text>
          </View>
          <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
            When enabled, MattBot will record screened calls. Recordings are encrypted and subject to your data retention policy.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ ...typography.body, color: colors.textPrimary }} allowFontScaling>
              Enable recording
            </Text>
            <Switch
              value={settings?.recording_enabled ?? false}
              onValueChange={v => handleToggle('recording_enabled', v)}
              trackColor={{ false: colors.border, true: colors.primary }}
              accessibilityLabel="Enable call recording"
              accessibilityRole="switch"
              accessibilityState={{ checked: settings?.recording_enabled ?? false }}
            />
          </View>
        </View>
      </Card>
    </ScreenWrapper>
  );
}
