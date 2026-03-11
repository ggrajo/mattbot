import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { apiClient, extractApiError } from '../api/client';

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];
const WINDOW_OPTIONS = [7, 14, 30, 60];

export function CalendarBookingSettingsScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const [calendarEnabled, setCalendarEnabled] = useState(false);
  const [defaultDuration, setDefaultDuration] = useState(30);
  const [bookingWindow, setBookingWindow] = useState(14);
  const [revision, setRevision] = useState(1);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const { data } = await apiClient.get('/settings');
      setCalendarEnabled(data.calendar_booking_enabled ?? false);
      setDefaultDuration(data.calendar_default_duration_minutes ?? 30);
      setBookingWindow(data.calendar_booking_window_days ?? 14);
      setRevision(data.revision ?? 1);
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

  async function saveSettings(changes: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await apiClient.patch('/settings', {
        expected_revision: revision,
        changes,
      });
      if (res.data?.revision) {
        setRevision(res.data.revision);
      }
    } catch (e) {
      Alert.alert('Error', extractApiError(e) || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  function handleCalendarEnabledToggle(value: boolean) {
    setCalendarEnabled(value);
    saveSettings({ calendar_booking_enabled: value });
  }

  function handleDurationSelect(duration: number) {
    setDefaultDuration(duration);
    saveSettings({ calendar_default_duration_minutes: duration });
  }

  function handleWindowSelect(days: number) {
    setBookingWindow(days);
    saveSettings({ calendar_booking_window_days: days });
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
            marginBottom: spacing.lg,
          }}
        >
          <Icon name="alert-circle-outline" size="md" color={colors.error} />
          <Text style={{ fontSize: 13, color: colors.error, flex: 1, marginLeft: spacing.sm }}>
            {error}
          </Text>
          <Pressable onPress={loadSettings}>
            <Text style={{ fontSize: 13, color: colors.error, fontWeight: '700' }}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {saving && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: spacing.sm }}>Saving...</Text>
        </View>
      )}

      {/* Calendar Booking Toggle */}
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
            <Text style={{ fontSize: 16, color: colors.textPrimary, fontWeight: '600' }}>
              Calendar Booking
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
              Allow the AI assistant to book meetings on your calendar
            </Text>
          </View>
          <Switch
            value={calendarEnabled}
            onValueChange={handleCalendarEnabledToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </View>

      {/* Default Duration Picker */}
      <View
        style={{
          backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
          borderRadius: radii.xl,
          padding: spacing.lg,
          marginBottom: spacing.lg,
        }}
      >
        <Text style={{ fontSize: 16, color: colors.textPrimary, fontWeight: '600', marginBottom: spacing.sm }}>
          Default Duration
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md }}>
          Default length of booked meetings (15-120 min)
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {DURATION_OPTIONS.map((d, idx) => (
            <Pressable
              key={d}
              onPress={() => handleDurationSelect(d)}
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.lg,
                borderRadius: radii.md,
                backgroundColor: defaultDuration === d ? colors.primary : colors.surface,
                borderWidth: defaultDuration === d ? 0 : 1,
                borderColor: colors.border,
                alignItems: 'center',
                marginRight: 8,
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: defaultDuration === d ? '#FFFFFF' : colors.textPrimary,
                }}
              >
                {d} min
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Booking Window Picker */}
      <View
        style={{
          backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
          borderRadius: radii.xl,
          padding: spacing.lg,
          marginBottom: spacing.lg,
        }}
      >
        <Text style={{ fontSize: 16, color: colors.textPrimary, fontWeight: '600', marginBottom: spacing.sm }}>
          Booking Window
        </Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md }}>
          How far in advance people can book meetings (1-60 days)
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {WINDOW_OPTIONS.map((w) => (
            <Pressable
              key={w}
              onPress={() => handleWindowSelect(w)}
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.lg,
                borderRadius: radii.md,
                backgroundColor: bookingWindow === w ? colors.primary : colors.surface,
                borderWidth: bookingWindow === w ? 0 : 1,
                borderColor: colors.border,
                alignItems: 'center',
                marginRight: 8,
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: bookingWindow === w ? '#FFFFFF' : colors.textPrimary,
                }}
              >
                {w} days
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
