import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { ListRow } from '../components/ui/ListRow';
import { Icon } from '../components/ui/Icon';
import { Divider } from '../components/ui/Divider';
import { Toast } from '../components/ui/Toast';
import { SuccessModal } from '../components/ui/SuccessModal';
import { Card } from '../components/ui/Card';
import { useTheme, useThemeContext, type ThemeMode } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { useTelephonyStore } from '../store/telephonyStore';
import { useCalendarStore } from '../store/calendarStore';
import { hapticLight } from '../utils/haptics';

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: string; color: string }[] = [
  { mode: 'system', label: 'Auto', icon: 'cellphone', color: '#6366F1' },
  { mode: 'light', label: 'Light', icon: 'white-balance-sunny', color: '#F59E0B' },
  { mode: 'dark', label: 'Dark', icon: 'moon-waning-crescent', color: '#8B5CF6' },
];

function maskPhone(e164: string): string {
  if (e164.length <= 6) return e164;
  return e164.slice(0, 2) + '*'.repeat(e164.length - 6) + e164.slice(-4);
}

function SectionHeader({ icon, label }: { icon: string; label: string }) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
      marginLeft: spacing.xs,
    }}>
      <View style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primary + '18',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Icon name={icon} size={14} color={colors.primary} />
      </View>
      <Text
        style={{
          ...typography.caption,
          color: colors.primary,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        }}
        allowFontScaling
      >
        {label}
      </Text>
    </View>
  );
}

export function SettingsScreen() {
  const theme = useTheme();
  const { themeMode, setThemeMode } = useThemeContext();
  const { updateSettings, settings } = useSettingsStore();
  const { numbers } = useTelephonyStore();
  const calendarStatus = useCalendarStore((s) => s.status);
  const loadCalendarStatus = useCalendarStore((s) => s.loadStatus);
  const activeNumber = numbers.find((n) => n.status === 'active');
  const { colors, spacing, typography, radii } = theme;
  const navigation = useNavigation<any>();
  const chevron = <Icon name="chevron-right" size="md" color={colors.textDisabled} />;
  const [toast, setToast] = useState('');
  const [successModal, setSuccessModal] = useState<{ title: string; message: string } | null>(null);
  const [numberRevealed, setNumberRevealed] = useState(false);

  useEffect(() => {
    loadCalendarStatus();
  }, []);

  const handleThemeChange = async (mode: ThemeMode) => {
    hapticLight();
    setThemeMode(mode);
    if (settings) {
      const ok = await updateSettings({ theme_preference: mode });
      if (!ok) {
        setToast(useSettingsStore.getState().error ?? 'Failed to save theme preference.');
      }
    }
  };

  return (
    <ScreenWrapper>
      <Toast message={toast} type="error" visible={!!toast} onDismiss={() => setToast('')} />
      <SuccessModal visible={!!successModal} title={successModal?.title ?? ''} message={successModal?.message} onDismiss={() => setSuccessModal(null)} />

      {/* Theme Selection */}
      <View style={{ marginBottom: spacing.xl }}>
        <SectionHeader icon="palette-outline" label="Appearance" />
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: colors.surface,
            borderRadius: radii.xl,
            padding: spacing.xs,
            gap: spacing.xs,
            ...(theme.dark ? { borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' } : {}),
          }}
        >
          {THEME_OPTIONS.map((opt) => {
            const isActive = themeMode === opt.mode;
            return (
              <TouchableOpacity
                key={opt.mode}
                onPress={() => handleThemeChange(opt.mode)}
                accessibilityLabel={`${opt.label} theme`}
                accessibilityRole="radio"
                accessibilityState={{ selected: isActive }}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: spacing.sm + 4,
                  borderRadius: radii.lg,
                  backgroundColor: isActive ? colors.primary : 'transparent',
                  gap: spacing.xs,
                }}
              >
                <Icon
                  name={opt.icon}
                  size="md"
                  color={isActive ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? '700' : '500',
                    color: isActive ? '#FFFFFF' : colors.textSecondary,
                  }}
                  allowFontScaling
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Divider />

      {/* Assistant */}
      <View style={{ gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.xl }}>
        <SectionHeader icon="robot-outline" label="Assistant" />
        <ListRow
          icon="robot-outline"
          iconColor={colors.primary}
          title="AI Assistant"
          subtitle="Name, voice, tone, language (global defaults)"
          onPress={() => navigation.navigate('AssistantSettings')}
          right={chevron}
          accessibilityLabel="AI Assistant settings"
        />
        <ListRow
          icon="shape-outline"
          iconColor={colors.accent}
          title="Category AI Defaults"
          subtitle="AI settings per category"
          onPress={() => navigation.navigate('CategoryDefaults')}
          right={chevron}
          accessibilityLabel="Category AI defaults"
        />
      </View>

      <Divider />

      {/* Phone & Calls */}
      <View style={{ gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.xl }}>
        <SectionHeader icon="phone-outline" label="Phone & Calls" />
        <ListRow
          icon="phone-settings-outline"
          iconColor="#6366F1"
          title="Call Modes"
          subtitle="Switch screening modes (work, personal, DND)"
          onPress={() => navigation.navigate('CallModes')}
          right={chevron}
          accessibilityLabel="Call modes"
        />
        <ListRow
          icon="phone-outline"
          iconColor={colors.primary}
          title={activeNumber ? (numberRevealed ? activeNumber.e164 : maskPhone(activeNumber.e164)) : 'No number provisioned'}
          subtitle={activeNumber ? 'Tap to manage' : 'Provision a number to get started'}
          onPress={() => navigation.navigate('NumberProvision')}
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              {activeNumber && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation?.();
                    setNumberRevealed((prev) => !prev);
                  }}
                  hitSlop={8}
                  accessibilityLabel={numberRevealed ? 'Hide number' : 'Show number'}
                  accessibilityRole="button"
                >
                  <Icon
                    name={numberRevealed ? 'eye-off-outline' : 'eye-outline'}
                    size="sm"
                    color={colors.textSecondary}
                  />
                </Pressable>
              )}
              {chevron}
            </View>
          }
          accessibilityLabel="AI phone number"
        />
        <ListRow
          icon="briefcase-clock-outline"
          iconColor={colors.primary}
          title="Business Hours"
          subtitle="Define availability and after-hours behavior"
          onPress={() => navigation.navigate('BusinessHours')}
          right={chevron}
          accessibilityLabel="Business Hours settings"
        />
        <ListRow
          icon="moon-waning-crescent"
          iconColor={colors.secondary}
          title="Quiet Hours"
          subtitle="Mute notifications on a schedule"
          onPress={() => navigation.navigate('QuietHours')}
          right={chevron}
          accessibilityLabel="Quiet Hours settings"
        />
        <ListRow
          icon="alert-octagon-outline"
          iconColor={colors.error}
          title="Urgent Call Alerts"
          subtitle="SMS, email, or call when urgent"
          onPress={() => navigation.navigate('UrgentNotifications')}
          right={chevron}
          accessibilityLabel="Urgent call notification settings"
        />
      </View>

      <Divider />

      {/* Contacts */}
      <View style={{ gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.xl }}>
        <SectionHeader icon="account-group-outline" label="Contacts" />
        <ListRow
          icon="account-group-outline"
          iconColor={colors.primary}
          title="Contacts"
          subtitle="Manage contacts and per-contact AI"
          onPress={() => navigation.navigate('ContactsList')}
          right={chevron}
          accessibilityLabel="Contacts list"
        />
        <ListRow
          icon="star-outline"
          iconColor="#F59E0B"
          title="VIP Contacts"
          subtitle="Priority callers that always get through"
          onPress={() => navigation.navigate('VipList')}
          right={chevron}
          accessibilityLabel="VIP contacts"
        />
        <ListRow
          icon="cancel"
          iconColor="#EF4444"
          title="Block List"
          subtitle="Blocked numbers and callers"
          onPress={() => navigation.navigate('BlockList')}
          right={chevron}
          accessibilityLabel="Block list"
        />
      </View>

      <Divider />

      {/* Calendar & Booking */}
      <View style={{ gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.xl }}>
        <SectionHeader icon="calendar-check-outline" label="Calendar & Booking" />
        <ListRow
          icon="calendar-check-outline"
          iconColor={colors.primary}
          title="Calendar & Booking Settings"
          subtitle={calendarStatus?.connected ? `Connected · ${calendarStatus.email ?? ''}` : 'Not connected'}
          onPress={() => navigation.navigate('CalendarBookingSettings')}
          right={chevron}
          accessibilityLabel="Calendar and booking settings"
        />
      </View>

      <Divider />

      {/* Messages */}
      <View style={{ gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.xl }}>
        <SectionHeader icon="message-text-outline" label="Messages" />
        <Card variant="elevated">
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon name="message-text-outline" size="md" color={colors.primary} />
              <Text style={{ ...typography.h3, color: colors.textPrimary, flex: 1 }} allowFontScaling>
                Text Approval
              </Text>
            </View>
            <Text style={{ ...typography.bodySmall, color: colors.textSecondary }} allowFontScaling>
              Control whether texts sent on your behalf require approval.
            </Text>
            {([
              { value: 'always_approve', label: 'Always Approve', desc: 'Review and approve every text before sending' },
              { value: 'auto_send', label: 'Auto Send', desc: 'Automatically send texts without approval' },
              { value: 'never', label: 'Never Send', desc: 'Never send texts on your behalf' },
            ] as const).map((opt) => {
              const selected = (settings?.text_approval_mode ?? 'always_approve') === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={async () => {
                    hapticLight();
                    const ok = await updateSettings({ text_approval_mode: opt.value });
                    if (!ok) {
                      setToast(useSettingsStore.getState().error ?? 'Failed to save text approval setting.');
                    }
                  }}
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
      </View>

      <Divider />

      {/* Data */}
      <View style={{ gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.xl }}>
        <SectionHeader icon="database-outline" label="Data" />
        <ListRow
          icon="brain"
          iconColor={colors.accent}
          title="Memory Settings"
          subtitle="Context memory and data retention"
          onPress={() => navigation.navigate('MemorySettings')}
          right={chevron}
          accessibilityLabel="Memory settings"
        />
        <ListRow
          icon="brain"
          iconColor={colors.accent}
          title="Memory Items"
          subtitle="View stored context from calls"
          onPress={() => navigation.navigate('MemoryList')}
          right={chevron}
          accessibilityLabel="Memory items"
        />
        <ListRow
          icon="bell-outline"
          iconColor={colors.warning}
          title="Reminders"
          subtitle="View and manage call reminders"
          onPress={() => navigation.navigate('RemindersList')}
          right={chevron}
          accessibilityLabel="Reminders"
        />
      </View>
    </ScreenWrapper>
  );
}
