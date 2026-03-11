import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Switch, TouchableOpacity } from 'react-native';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { IconButton } from '../components/ui/IconButton';
import { ConfirmSheet } from '../components/ui/ConfirmSheet';
import { StatusScreen } from '../components/ui/StatusScreen';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { useDeviceStore } from '../store/deviceStore';
import { useSettingsStore } from '../store/settingsStore';
import { getDeviceTimezone } from '../utils/formatDate';
import { revokeDevice, rememberDevice, DeviceInfo } from '../api/devices';
import { extractApiError } from '../api/client';
import { StepUpPrompt } from '../components/auth/StepUpPrompt';
import { Toast } from '../components/ui/Toast';

function platformIcon(platform: string): string {
  const p = platform?.toLowerCase() ?? '';
  if (p.includes('ios') || p.includes('iphone')) return 'apple';
  if (p.includes('android')) return 'android';
  if (p.includes('tablet') || p.includes('ipad')) return 'tablet';
  if (p.includes('web')) return 'monitor';
  return 'cellphone';
}

function timeAgo(dateStr: string, tz?: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const opts: Intl.DateTimeFormatOptions = {};
  if (tz) opts.timeZone = tz;
  return new Date(dateStr).toLocaleDateString(undefined, opts);
}

export function DeviceListScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const { devices, loading, error, fetchDevices } = useDeviceStore();
  const userTz = useSettingsStore(s => s.settings?.timezone) || getDeviceTimezone();
  const [revoking, setRevoking] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<DeviceInfo | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showStepUp, setShowStepUp] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRevoke = useCallback((device: DeviceInfo) => {
    setRevokeTarget(device);
  }, []);

  function performRevoke() {
    if (!revokeTarget) return;
    setShowStepUp(true);
  }

  async function handleStepUpSuccess(stepUpToken: string) {
    setShowStepUp(false);
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await revokeDevice(revokeTarget.id, stepUpToken);
      setRevokeTarget(null);
      await fetchDevices();
    } catch (e) {
      setActionError(extractApiError(e));
      setRevokeTarget(null);
    } finally {
      setRevoking(false);
    }
  }

  async function handleRememberToggle(device: DeviceInfo, value: boolean) {
    try {
      await rememberDevice(device.id, value);
      await fetchDevices();
    } catch (e) {
      setActionError(extractApiError(e));
    }
  }

  function renderDevice({ item, index }: { item: DeviceInfo; index: number }) {
    const isExpanded = expandedId === item.id;

    return (
      <FadeIn delay={index * 40} slide="up">
      <Card
        variant="elevated"
        style={{
          marginBottom: spacing.sm,
          backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
          borderWidth: 1,
          borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
        }}
      >
        <TouchableOpacity
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`${item.device_name || 'Unknown device'}, tap to ${isExpanded ? 'collapse' : 'expand'} details`}
        >
          {/* Header row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radii.md,
                backgroundColor: (item.is_current ? colors.success : colors.textSecondary) + '14',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon
                name={platformIcon(item.platform)}
                size="lg"
                color={item.is_current ? colors.success : colors.textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Text
                  style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}
                  numberOfLines={1}
                  allowFontScaling
                >
                  {item.device_name || 'Unknown Device'}
                </Text>
                {item.is_current && <Badge label="Current" variant="success" />}
                {item.is_remembered && !item.is_current && (
                  <Badge label="Trusted" variant="info" />
                )}
              </View>
              <Text
                style={{ ...typography.caption, color: colors.textSecondary, marginTop: 2 }}
                numberOfLines={1}
                allowFontScaling
              >
                {item.platform.charAt(0).toUpperCase() + item.platform.slice(1)}
                {item.os_version ? ` ${item.os_version}` : ''}
                {item.last_seen_at ? ` · ${timeAgo(item.last_seen_at, userTz)}` : ''}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              {!item.is_current && (
                <IconButton
                  icon="close-circle-outline"
                  onPress={() => handleRevoke(item)}
                  color={colors.error}
                  accessibilityLabel={`Revoke ${item.device_name || 'device'}`}
                />
              )}
              <Icon
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size="md"
                color={colors.textDisabled}
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* Expanded details */}
        {isExpanded && (
          <View
            style={{
              marginTop: spacing.md,
              paddingTop: spacing.md,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              gap: spacing.sm,
            }}
          >
            <DetailRow
              icon="ip-network-outline"
              label="IP Address"
              value={item.last_ip || 'Unknown'}
              colors={colors}
              typography={typography}
              spacing={spacing}
            />
            <DetailRow
              icon="map-marker-outline"
              label="Location"
              value={item.last_location || 'Unknown'}
              colors={colors}
              typography={typography}
              spacing={spacing}
            />
            <DetailRow
              icon="cellphone"
              label="Platform"
              value={`${item.platform.charAt(0).toUpperCase() + item.platform.slice(1)}${item.os_version ? ' ' + item.os_version : ''}`}
              colors={colors}
              typography={typography}
              spacing={spacing}
            />
            {item.app_version && (
              <DetailRow
                icon="application-outline"
                label="App Version"
                value={item.app_version}
                colors={colors}
                typography={typography}
                spacing={spacing}
              />
            )}
            <DetailRow
              icon="calendar-outline"
              label="Registered"
              value={new Date(item.created_at).toLocaleDateString(undefined, { timeZone: userTz })}
              colors={colors}
              typography={typography}
              spacing={spacing}
            />

            {!item.is_current && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: spacing.sm,
                  paddingTop: spacing.sm,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ ...typography.bodySmall, color: colors.textPrimary, fontWeight: '500' }}
                    allowFontScaling
                  >
                    Remember this device
                  </Text>
                  <Text
                    style={{ ...typography.caption, color: colors.textSecondary }}
                    allowFontScaling
                  >
                    Trusted devices skip step-up verification
                  </Text>
                </View>
                <Switch
                  value={item.is_remembered}
                  onValueChange={(v) => handleRememberToggle(item, v)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  accessibilityLabel="Remember this device"
                />
              </View>
            )}
          </View>
        )}
      </Card>
      </FadeIn>
    );
  }

  return (
    <ScreenWrapper scroll={false} keyboardAvoiding={false}>
      <Toast message={actionError ?? ''} type="error" visible={!!actionError} onDismiss={() => setActionError(null)} />
      <LoadingOverlay visible={revoking} message="Revoking device..." />

      <FadeIn delay={0} slide="up">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }}>
          <Icon name="devices" size="lg" color={colors.primary} />
          <Text style={{ ...typography.h2, color: colors.textPrimary, flex: 1 }} allowFontScaling>
            Your Devices
          </Text>
          <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
            {devices.length} active
          </Text>
        </View>
      </FadeIn>

      {error && <ErrorMessage message={error} action="Retry" onAction={fetchDevices} />}

      <FlatList
        data={devices}
        renderItem={renderDevice}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={fetchDevices}
        contentContainerStyle={
          devices.length === 0
            ? { flex: 1, justifyContent: 'center', alignItems: 'center' }
            : { paddingBottom: spacing.xl }
        }
        ListEmptyComponent={
          !loading ? (
            <StatusScreen
              icon="cellphone-off"
              iconColor={colors.textDisabled}
              title="No devices"
              subtitle="No devices are currently registered to your account."
              action={{ title: 'Refresh', onPress: fetchDevices, variant: 'outline' }}
            />
          ) : null
        }
      />

      <ConfirmSheet
        visible={!!revokeTarget && !showStepUp}
        onDismiss={() => setRevokeTarget(null)}
        icon="alert-circle-outline"
        iconColor={colors.error}
        title="Revoke device?"
        message={`This will sign out all sessions on "${revokeTarget?.device_name || 'Unknown device'}". This action cannot be undone.`}
        confirmLabel="Revoke Device"
        cancelLabel="Cancel"
        destructive
        onConfirm={performRevoke}
        loading={revoking}
      />

      <StepUpPrompt
        visible={showStepUp}
        onSuccess={handleStepUpSuccess}
        onCancel={() => { setShowStepUp(false); setRevokeTarget(null); }}
        title="Verify to revoke device"
        message="Enter your password to revoke this device."
      />
    </ScreenWrapper>
  );
}

function DetailRow({
  icon,
  label,
  value,
  colors,
  typography,
  spacing,
}: {
  icon: string;
  label: string;
  value: string;
  colors: any;
  typography: any;
  spacing: any;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <Icon name={icon} size="sm" color={colors.textSecondary} />
      <Text
        style={{ ...typography.caption, color: colors.textSecondary, width: 80 }}
        allowFontScaling
      >
        {label}
      </Text>
      <Text
        style={{ ...typography.bodySmall, color: colors.textPrimary, flex: 1 }}
        numberOfLines={1}
        allowFontScaling
      >
        {value}
      </Text>
    </View>
  );
}
