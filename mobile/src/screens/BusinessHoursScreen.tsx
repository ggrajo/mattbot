import React, { useEffect, useState } from 'react';
import { View, Text, Switch, Platform, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Toast } from '../components/ui/Toast';
import { SuccessModal } from '../components/ui/SuccessModal';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { hapticLight } from '../utils/haptics';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BusinessHours'>;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseTimeToDate(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 9, m ?? 0, 0, 0);
  return d;
}

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function BusinessHoursScreen({ navigation }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const { settings, saving, loadSettings, updateSettings } = useSettingsStore();

  const [enabled, setEnabled] = useState(false);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('17:00');
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [successModal, setSuccessModal] = useState<{ title: string; message: string } | null>(null);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.business_hours_enabled);
      setStart(settings.business_hours_start ?? '09:00');
      setEnd(settings.business_hours_end ?? '17:00');
      setDays(settings.business_hours_days ?? [1, 2, 3, 4, 5]);
    }
  }, [settings]);

  const toggleDay = (day: number) => {
    hapticLight();
    setDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort());
  };

  const handleSave = async () => {
    const ok = await updateSettings({
      business_hours_enabled: enabled,
      business_hours_start: start,
      business_hours_end: end,
      business_hours_days: days,
    });
    if (ok) {
      setSuccessModal({ title: 'Saved', message: 'Business hours saved successfully.' });
    } else {
      setToast({ message: 'Failed to save', type: 'error' });
    }
  };

  return (
    <ScreenWrapper>
      <Toast
        message={toast?.message ?? ''}
        type={toast?.type}
        visible={!!toast}
        onDismiss={() => setToast(null)}
      />
      <SuccessModal
        visible={!!successModal}
        title={successModal?.title ?? ''}
        message={successModal?.message}
        onDismiss={() => { setSuccessModal(null); navigation.goBack(); }}
      />

      <Text
        style={{ ...typography.h2, color: colors.textPrimary, marginBottom: spacing.sm }}
        allowFontScaling
      >
        Business Hours
      </Text>
      <Text
        style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl }}
        allowFontScaling
      >
        Control when your assistant answers calls.
      </Text>

      <Card style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radii.md,
                backgroundColor: (enabled ? colors.success : colors.textDisabled) + '1A',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon
                name={enabled ? 'clock-check-outline' : 'clock-outline'}
                size="lg"
                color={enabled ? colors.success : colors.textDisabled}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }} allowFontScaling>
                Enable Business Hours
              </Text>
              <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                Restrict when your assistant is active
              </Text>
            </View>
          </View>
          <Switch
            value={enabled}
            onValueChange={(v) => { hapticLight(); setEnabled(v); }}
            trackColor={{ false: colors.surfaceVariant, true: colors.primary + '66' }}
            thumbColor={enabled ? colors.primary : colors.textDisabled}
          />
        </View>
      </Card>

      {enabled && (
        <>
          <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Icon name="clock-time-four-outline" size="md" color={colors.primary} />
                <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
                  Working Hours
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <TouchableOpacity
                  onPress={() => { hapticLight(); setShowStartPicker(true); }}
                  activeOpacity={0.7}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    backgroundColor: colors.primary + '0F',
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.lg,
                    borderRadius: radii.md,
                    borderWidth: 1.5,
                    borderColor: showStartPicker ? colors.primary : colors.border,
                  }}
                  accessibilityLabel={`Start time ${start}`}
                  accessibilityRole="button"
                >
                  <Icon name="weather-sunset-up" size="md" color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                      Start
                    </Text>
                    <Text style={{ ...typography.h3, color: colors.textPrimary }} allowFontScaling>
                      {start}
                    </Text>
                  </View>
                </TouchableOpacity>

                <Icon name="arrow-right" size="md" color={colors.textDisabled} />

                <TouchableOpacity
                  onPress={() => { hapticLight(); setShowEndPicker(true); }}
                  activeOpacity={0.7}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    backgroundColor: colors.accent + '0F',
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.lg,
                    borderRadius: radii.md,
                    borderWidth: 1.5,
                    borderColor: showEndPicker ? colors.accent : colors.border,
                  }}
                  accessibilityLabel={`End time ${end}`}
                  accessibilityRole="button"
                >
                  <Icon name="weather-sunset-down" size="md" color={colors.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                      End
                    </Text>
                    <Text style={{ ...typography.h3, color: colors.textPrimary }} allowFontScaling>
                      {end}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {showStartPicker && (
                <DateTimePicker
                  value={parseTimeToDate(start)}
                  mode="time"
                  is24Hour
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, date) => {
                    setShowStartPicker(Platform.OS === 'ios');
                    if (date) setStart(formatTime(date));
                  }}
                />
              )}

              {showEndPicker && (
                <DateTimePicker
                  value={parseTimeToDate(end)}
                  mode="time"
                  is24Hour
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, date) => {
                    setShowEndPicker(Platform.OS === 'ios');
                    if (date) setEnd(formatTime(date));
                  }}
                />
              )}
            </View>
          </Card>

          <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Icon name="calendar-week" size="md" color={colors.accent} />
                <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
                  Active Days
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs }}>
                {DAYS.map((label, i) => {
                  const active = days.includes(i);
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => toggleDay(i)}
                      activeOpacity={0.7}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: spacing.md,
                        borderRadius: radii.full,
                        backgroundColor: active ? colors.primary : 'transparent',
                        borderWidth: active ? 0 : 1.5,
                        borderColor: colors.border,
                        minWidth: 40,
                      }}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: active }}
                      accessibilityLabel={`${label} ${active ? 'active' : 'inactive'}`}
                    >
                      <Text
                        style={{
                          ...typography.bodySmall,
                          fontWeight: '600',
                          color: active ? colors.onPrimary : colors.textSecondary,
                        }}
                        allowFontScaling
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Card>

        </>
      )}

      <Button
        title="Save Changes"
        icon="content-save-outline"
        onPress={handleSave}
        loading={saving}
      />
    </ScreenWrapper>
  );
}
