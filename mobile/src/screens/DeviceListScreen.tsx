import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { Toast } from '../components/ui/Toast';
import { ConfirmSheet } from '../components/ui/ConfirmSheet';
import { FadeIn } from '../components/ui/FadeIn';
import { StatusScreen } from '../components/ui/StatusScreen';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { useDeviceStore } from '../store/deviceStore';
import { revokeDevice, DeviceInfo } from '../api/devices';
import { apiClient, extractApiError } from '../api/client';
import { formatRelativeTime, formatDate } from '../utils/formatDate';
import { hapticLight, hapticMedium } from '../utils/haptics';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'DeviceList'>;

function maskIp(ip: string | null): string {
  if (!ip) return '—';
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.*`;
  }
  // IPv6 or other formats – show first segment only
  const segments = ip.split(':');
  if (segments.length > 2) {
    return `${segments[0]}:${segments[1]}:*:*`;
  }
  return ip;
}

function platformIcon(platform: string): string {
  const p = platform?.toLowerCase();
  if (p === 'ios') return 'apple';
  if (p === 'android') return 'android';
  if (p === 'web') return 'web';
  return 'cellphone';
}

function platformLabel(platform: string): string {
  const p = platform?.toLowerCase();
  if (p === 'ios') return 'iOS';
  if (p === 'android') return 'Android';
  if (p === 'web') return 'Web';
  return platform || 'Unknown';
}

export function DeviceListScreen({ navigation }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const userTz = useSettingsStore((s) => s.settings?.timezone) || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { devices, loading, error, fetchDevices } = useDeviceStore();

  const [removing, setRemoving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<DeviceInfo | null>(null);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const [stepUpAction, setStepUpAction] = useState<null | 'remove'>(null);
  const [totpCode, setTotpCode] = useState('');
  const [stepUpError, setStepUpError] = useState('');
  const [verifyingStepUp, setVerifyingStepUp] = useState(false);
  const totpInputRef = useRef<RNTextInput>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRefresh = useCallback(() => {
    fetchDevices();
  }, [fetchDevices]);

  function handleRemove() {
    if (!removeTarget) return;
    hapticMedium();
    setStepUpAction('remove');
    setTotpCode('');
    setStepUpError('');
  }

  async function handleStepUpVerify() {
    if (totpCode.length < 6) return;
    setVerifyingStepUp(true);
    setStepUpError('');
    try {
      const { data } = await apiClient.post('/auth/step-up', { totp_code: totpCode });
      const token = data.step_up_token as string;
      setStepUpAction(null);
      setTotpCode('');
      await executeRemove(token);
    } catch (e) {
      setStepUpError(extractApiError(e));
    } finally {
      setVerifyingStepUp(false);
    }
  }

  async function executeRemove(stepUpToken: string) {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await revokeDevice(removeTarget.id, stepUpToken);
      setToastType('success');
      setToast('Device removed');
      await fetchDevices();
    } catch (err) {
      setToastType('error');
      setToast(extractApiError(err));
    } finally {
      setRemoving(false);
      setRemoveTarget(null);
    }
  }

  function cancelStepUp() {
    setStepUpAction(null);
    setTotpCode('');
    setStepUpError('');
    setRemoveTarget(null);
  }

  function renderDetailRow(icon: string, label: string, value: string) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <Icon name={icon} size="sm" color={colors.textSecondary} />
        <Text
          style={{ ...typography.caption, color: colors.textSecondary }}
          allowFontScaling
        >
          {label}
        </Text>
        <Text
          style={{
            ...typography.caption,
            color: colors.textPrimary,
            fontWeight: '500',
            marginLeft: 'auto',
          }}
          numberOfLines={1}
          allowFontScaling
        >
          {value}
        </Text>
      </View>
    );
  }

  function renderDevice({ item, index }: { item: DeviceInfo; index: number }) {
    const deviceName =
      item.device_name ||
      `${platformLabel(item.platform)} Device`;

    const card = (
      <Card variant="elevated" style={{ marginBottom: spacing.md }}>
        <View style={{ gap: spacing.md }}>
          {/* Header row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: item.is_current
                  ? colors.primary + '18'
                  : colors.textSecondary + '14',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon
                name={platformIcon(item.platform)}
                size="md"
                color={item.is_current ? colors.primary : colors.textSecondary}
              />
            </View>

            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
              >
                <Text
                  style={{
                    ...typography.body,
                    color: colors.textPrimary,
                    fontWeight: '600',
                    flexShrink: 1,
                  }}
                  numberOfLines={1}
                  allowFontScaling
                >
                  {deviceName}
                </Text>
                {item.is_current && (
                  <Badge label="Current Device" variant="success" />
                )}
              </View>
              <Text
                style={{
                  ...typography.caption,
                  color: colors.textSecondary,
                  marginTop: 2,
                }}
                allowFontScaling
              >
                {platformLabel(item.platform)}
                {item.os_version ? ` ${item.os_version}` : ''}
              </Text>
            </View>
          </View>

          {/* Detail rows */}
          <View
            style={{
              gap: spacing.xs,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: spacing.sm,
            }}
          >
            {item.app_version &&
              renderDetailRow(
                'application-outline',
                'App Version',
                item.app_version,
              )}
            {renderDetailRow(
              'ip-network-outline',
              'IP Address',
              maskIp(item.last_ip),
            )}
            {item.last_location &&
              renderDetailRow(
                'map-marker-outline',
                'Location',
                item.last_location,
              )}
            {item.last_seen_at &&
              renderDetailRow(
                'clock-outline',
                'Last Seen',
                formatRelativeTime(item.last_seen_at, userTz),
              )}
            {renderDetailRow(
              'calendar-outline',
              'Registered',
              formatDate(item.created_at, userTz),
            )}
          </View>

          {!item.is_current && (
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingTop: spacing.sm,
              }}
            >
              <Button
                title="Remove Device"
                variant="destructive"
                icon="trash-can-outline"
                onPress={() => {
                  hapticLight();
                  setRemoveTarget(item);
                }}
                accessibilityLabel={`Remove ${deviceName}`}
              />
            </View>
          )}
        </View>
      </Card>
    );

    if (index < 6) {
      return <FadeIn delay={Math.min(index * 50, 250)}>{card}</FadeIn>;
    }
    return card;
  }

  if (stepUpAction) {
    return (
      <ScreenWrapper scroll={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: colors.accent + '18',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: spacing.lg,
            }}>
              <Icon name="two-factor-authentication" size={36} color={colors.accent} />
            </View>

            <Text style={{ ...typography.h2, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm }} allowFontScaling>
              Verify Your Identity
            </Text>
            <Text style={{ ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl }} allowFontScaling>
              Enter your 6-digit authenticator code to remove this device
            </Text>

            <View style={{ width: '100%', maxWidth: 280, marginBottom: spacing.lg }}>
              <RNTextInput
                ref={totpInputRef}
                value={totpCode}
                onChangeText={(t) => setTotpCode(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                style={{
                  fontSize: 32,
                  fontWeight: '700',
                  letterSpacing: 12,
                  textAlign: 'center',
                  color: colors.textPrimary,
                  paddingVertical: spacing.md,
                  borderBottomWidth: 2,
                  borderBottomColor: stepUpError ? colors.error : colors.primary,
                }}
                placeholder="000000"
                placeholderTextColor={colors.textDisabled}
              />
            </View>

            {stepUpError ? (
              <Text style={{ ...typography.bodySmall, color: colors.error, textAlign: 'center', marginBottom: spacing.md }} allowFontScaling>
                {stepUpError}
              </Text>
            ) : null}

            <View style={{ width: '100%', maxWidth: 280, gap: spacing.sm }}>
              <Button
                title="Verify & Continue"
                onPress={handleStepUpVerify}
                loading={verifyingStepUp}
                disabled={totpCode.length < 6}
              />
              <Button
                title="Cancel"
                variant="secondary"
                onPress={cancelStepUp}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper scroll={false} keyboardAvoiding={false}>
      <Toast
        message={toast}
        type={toastType}
        visible={!!toast}
        onDismiss={() => setToast('')}
      />
      <LoadingOverlay visible={removing} message="Removing device..." />

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          marginBottom: spacing.lg,
        }}
      >
        <Icon name="devices" size="lg" color={colors.primary} />
        <Text
          style={{ ...typography.h2, color: colors.textPrimary, flex: 1 }}
          allowFontScaling
        >
          Your Devices
        </Text>
        {devices.length > 0 && (
          <Text
            style={{ ...typography.caption, color: colors.textSecondary }}
            allowFontScaling
          >
            {devices.length} {devices.length === 1 ? 'device' : 'devices'}
          </Text>
        )}
      </View>

      {error && (
        <ErrorMessage
          message={error}
          action="Retry"
          onAction={handleRefresh}
        />
      )}

      <FlatList
        data={devices}
        renderItem={renderDevice}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={
          devices.length === 0
            ? { flex: 1, justifyContent: 'center', alignItems: 'center' }
            : { paddingBottom: spacing.xl }
        }
        ListEmptyComponent={
          loading ? null : (
            <StatusScreen
              icon="cellphone-link"
              iconColor={colors.textDisabled}
              title="No devices found"
              subtitle="Devices you sign in on will appear here. You can manage trusted devices and revoke access."
            />
          )
        }
      />

      <ConfirmSheet
        visible={!!removeTarget}
        onDismiss={() => setRemoveTarget(null)}
        title="Remove this device?"
        message={`"${removeTarget?.device_name || 'Unknown device'}" will be signed out and removed from your account.`}
        icon="trash-can-outline"
        destructive
        confirmLabel="Remove"
        onConfirm={handleRemove}
        loading={removing}
      />
    </ScreenWrapper>
  );
}
