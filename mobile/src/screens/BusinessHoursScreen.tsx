import React, { useEffect, useState } from 'react';
import { View, Text, Switch, Platform, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Toast } from '../components/ui/Toast';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { hapticLight } from '../utils/haptics';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BusinessHours'>;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type AfterHoursBehavior = 'voicemail' | 'custom_message' | 'no_answer';

const AFTER_HOURS_OPTIONS: { value: AfterHoursBehavior; label: string; desc: string; icon: string }[] = [
  { value: 'voicemail', label: 'Voicemail', desc: 'AI takes a message from the caller', icon: 'voicemail' },
  { value: 'custom_message', label: 'Custom message', desc: 'Play a custom after-hours response', icon: 'message-text-outline' },
  { value: 'no_answer', label: "Don't answer", desc: "Calls go unanswered outside hours", icon: 'phone-off-outline' },
];

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
  const [afterHours, setAfterHours] = useState<AfterHoursBehavior>('voicemail');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.business_hours_enabled);
      setStart(settings.business_hours_start ?? '09:00');
      setEnd(settings.business_hours_end ?? '17:00');
      setDays(settings.business_hours_days ?? [1, 2, 3, 4, 5]);
      setAfterHours((settings.after_hours_behavior as AfterHoursBehavior) ?? 'voicemail');
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
      after_hours_behavior: afterHours,
    });
    if (ok) {
      setToast({ message: 'Business hours saved', type: 'success' });
      setTimeout(() => navigation.goBack(), 500);
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

          <Card variant="elevated" style={{ marginBottom: spacing.xl }}>
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Icon name="phone-missed-outline" size="md" color={colors.warning} />
                <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
                  After-Hours Behavior
                </Text>
              </View>
              <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
                What happens when someone calls outside business hours?
              </Text>

              {AFTER_HOURS_OPTIONS.map((opt) => {
                const selected = afterHours === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => { hapticLight(); setAfterHours(opt.value); }}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                      paddingVertical: spacing.md,
                      paddingHorizontal: spacing.md,
                      borderRadius: radii.md,
                      borderWidth: 1.5,
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary + '14' : 'transparent',
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={opt.label}
                  >
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: radii.md,
                        backgroundColor: selected ? colors.primary + '1A' : colors.surfaceVariant,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon
                        name={opt.icon}
                        size="md"
                        color={selected ? colors.primary : colors.textSecondary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          ...typography.body,
                          color: colors.textPrimary,
                          fontWeight: selected ? '600' : '400',
                        }}
                        allowFontScaling
                      >
                        {opt.label}
                      </Text>
                      <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
                        {opt.desc}
                      </Text>
                    </View>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor: selected ? colors.primary : colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {selected && (
                        <View
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            backgroundColor: colors.primary,
                          }}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
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
