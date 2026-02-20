import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, FlatList, TouchableOpacity, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import { useTheme } from '../theme/ThemeProvider';
import { useDeviceStore } from '../store/deviceStore';
import { revokeDevice } from '../api/devices';
import { stepUp } from '../api/auth';
import { extractApiError } from '../api/client';
import { DeviceInfo } from '../api/devices';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'DeviceList'>;

export function DeviceListScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;
  const { devices, loading, error, fetchDevices } = useDeviceStore();
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, []);

  async function handleRevoke(device: DeviceInfo) {
    Alert.alert(
      'Revoke device',
      `Are you sure you want to remove "${device.device_name || 'Unknown device'}"? This will sign out all sessions on that device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () => performRevoke(device.id),
        },
      ]
    );
  }

  async function performRevoke(deviceId: string) {
    setRevoking(true);
    try {
      const stepUpData = await stepUp(undefined, undefined);
      await revokeDevice(deviceId, stepUpData.step_up_token);
      await fetchDevices();
    } catch (error) {
      Alert.alert('Error', extractApiError(error));
    } finally {
      setRevoking(false);
    }
  }

  function renderDevice({ item }: { item: DeviceInfo }) {
    return (
      <Card style={{ marginBottom: spacing.md }}>
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
              {item.device_name || 'Unknown device'}
            </Text>
            {item.is_current && <Badge label="Current" variant="success" />}
          </View>

          <View style={{ gap: spacing.xs }}>
            <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
              Platform: {item.platform}
            </Text>
            {item.os_version && (
              <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
                OS: {item.os_version}
              </Text>
            )}
            {item.last_seen_at && (
              <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
                Last active: {new Date(item.last_seen_at).toLocaleDateString()}
              </Text>
            )}
          </View>

          {!item.is_current && (
            <Button
              title="Revoke"
              variant="destructive"
              onPress={() => handleRevoke(item)}
              style={{ marginTop: spacing.sm }}
            />
          )}
        </View>
      </Card>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <LoadingOverlay visible={revoking} message="Revoking device..." />
      <View style={{ flex: 1, padding: spacing.xl }}>
        <Text style={{ ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg }} allowFontScaling>
          Your devices
        </Text>

        {error && <ErrorMessage message={error} action="Retry" onAction={fetchDevices} />}

        <FlatList
          data={devices}
          renderItem={renderDevice}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={fetchDevices}
          contentContainerStyle={devices.length === 0 ? { flex: 1, justifyContent: 'center', alignItems: 'center' } : undefined}
          ListEmptyComponent={
            !loading ? (
              <Text style={{ ...typography.body, color: colors.textSecondary }} allowFontScaling>
                No devices found
              </Text>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}
