import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';

const DURATION_OPTIONS = [15, 30, 45, 60];
const BUFFER_OPTIONS = [0, 5, 10, 15, 30];

export function CalendarBookingSettingsScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const [calendarEnabled, setCalendarEnabled] = useState(false);
  const [blockBusyTimes, setBlockBusyTimes] = useState(false);
  const [slotDuration, setSlotDuration] = useState(30);
  const [bufferMinutes, setBufferMinutes] = useState(10);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const { data } = await apiClient.get('/settings');
      setCalendarEnabled(data.calendar_availability_enabled ?? false);
      setBlockBusyTimes(data.calendar_block_busy ?? false);
      setSlotDuration(data.booking_slot_duration ?? 30);
      setBufferMinutes(data.booking_buffer_minutes ?? 10);
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings]),
  );

  async function saveSettings(patch: Record<string, unknown>) {
    setSaving(true);
    try {
      await apiClient.patch('/settings', patch);
    } catch (e) {
      Alert.alert('Error', extractApiError(e) || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  function handleCalendarEnabledToggle(value: boolean) {
    setCalendarEnabled(value);
    saveSettings({ calendar_availability_enabled: value });
  }

  function handleBlockBusyToggle(value: boolean) {
    setBlockBusyTimes(value);
    saveSettings({ calendar_block_busy: value });
  }

  function handleDurationSelect(duration: number) {
    setSlotDuration(duration);
    saveSettings({ booking_slot_duration: duration });
  }

  function handleBufferSelect(buffer: number) {
    setBufferMinutes(buffer);
    saveSettings({ booking_buffer_minutes: buffer });
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
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
    >
      {error ? (
        <View
          style={{
            backgroundColor: colors.errorContainer,
            borderRadius: radii.md,
            padding: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            marginBottom: spacing.lg,
          }}
        >
          <Icon name="alert-circle-outline" size="md" color={colors.error} />
          <Text style={{ ...typography.bodySmall, color: colors.error, flex: 1 }} allowFontScaling>
            {error}
          </Text>
          <TouchableOpacity onPress={loadSettings}>
            <Text style={{ ...typography.bodySmall, color: colors.error, fontWeight: '700' }} allowFontScaling>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {saving && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>Saving...</Text>
        </View>
      )}

      {/* Calendar Availability Toggle */}
      <View
        style={{
          backgroundColor: colors.surfaceElevated,
          borderRadius: radii.xl,
          padding: spacing.lg,
          marginBottom: spacing.lg,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: spacing.md }}>
            <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }} allowFontScaling>
              Calendar-Based Availability
            </Text>
            <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: 4 }} allowFontScaling>
              Use your calendar to determine when you're available for bookings
            </Text>
          </View>
          <Switch
            value={calendarEnabled}
            onValueChange={handleCalendarEnabledToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>

      {/* Block Busy Times Toggle */}
      <View
        style={{
          backgroundColor: colors.surfaceElevated,
          borderRadius: radii.xl,
          padding: spacing.lg,
          marginBottom: spacing.lg,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: spacing.md }}>
            <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }} allowFontScaling>
              Block Busy Times
            </Text>
            <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: 4 }} allowFontScaling>
              Automatically block time slots when you have existing events
            </Text>
          </View>
          <Switch
            value={blockBusyTimes}
            onValueChange={handleBlockBusyToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>

      {/* Slot Duration Picker */}
      <View
        style={{
          backgroundColor: colors.surfaceElevated,
          borderRadius: radii.xl,
          padding: spacing.lg,
          marginBottom: spacing.lg,
        }}
      >
        <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600', marginBottom: spacing.sm }} allowFontScaling>
          Slot Duration
        </Text>
        <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md }} allowFontScaling>
          How long each booking slot should be
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {DURATION_OPTIONS.map((d) => (
            <TouchableOpacity
              key={d}
              onPress={() => handleDurationSelect(d)}
              style={{
                flex: 1,
                paddingVertical: spacing.md,
                borderRadius: radii.md,
                backgroundColor: slotDuration === d ? colors.primary : colors.surface,
                borderWidth: slotDuration === d ? 0 : 1,
                borderColor: colors.border,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  ...typography.bodySmall,
                  fontWeight: '600',
                  color: slotDuration === d ? colors.onPrimary : colors.textPrimary,
                }}
                allowFontScaling
              >
                {d} min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Buffer Time Picker */}
      <View
        style={{
          backgroundColor: colors.surfaceElevated,
          borderRadius: radii.xl,
          padding: spacing.lg,
          marginBottom: spacing.lg,
        }}
      >
        <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600', marginBottom: spacing.sm }} allowFontScaling>
          Buffer Time
        </Text>
        <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md }} allowFontScaling>
          Break between consecutive meetings
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          {BUFFER_OPTIONS.map((b) => (
            <TouchableOpacity
              key={b}
              onPress={() => handleBufferSelect(b)}
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.lg,
                borderRadius: radii.md,
                backgroundColor: bufferMinutes === b ? colors.primary : colors.surface,
                borderWidth: bufferMinutes === b ? 0 : 1,
                borderColor: colors.border,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  ...typography.bodySmall,
                  fontWeight: '600',
                  color: bufferMinutes === b ? colors.onPrimary : colors.textPrimary,
                }}
                allowFontScaling
              >
                {b === 0 ? 'None' : `${b} min`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
