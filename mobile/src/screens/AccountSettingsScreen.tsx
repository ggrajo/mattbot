import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Pressable, SectionList,
  TextInput as RNTextInput, Platform,
} from 'react-native';
import { GradientView } from '../components/ui/GradientView';
import { useFocusEffect } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation } from '@react-navigation/native';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { ListRow } from '../components/ui/ListRow';
import { Divider } from '../components/ui/Divider';
import { ConfirmSheet } from '../components/ui/ConfirmSheet';
import { Toast } from '../components/ui/Toast';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useBillingStore } from '../store/billingStore';
import { useTelephonyStore } from '../store/telephonyStore';
import { logout, logoutAll, stepUp, deleteAccount } from '../api/auth';
import { extractApiError } from '../api/client';
import { getDeviceTimezone } from '../utils/formatDate';
import { TIMEZONE_SECTIONS, tzLabel, getTimezoneAbbr, type TimezoneEntry, type TimezoneSection } from '../utils/timezones';

function maskPhone(e164: string): string {
  if (e164.length <= 6) return e164;
  return e164.slice(0, 2) + '*'.repeat(e164.length - 6) + e164.slice(-4);
}

function formatTimeRemaining(endDate: Date): string {
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  if (diffMs <= 0) return 'Expired';

  const totalDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (totalDays <= 0) return 'Today';

  const months = Math.floor(totalDays / 30);
  const weeks = Math.floor((totalDays % 30) / 7);
  const days = totalDays % 7;

  const parts: string[] = [];
  if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
  if (weeks > 0) parts.push(`${weeks} week${weeks > 1 ? 's' : ''}`);
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  return parts.join(', ') + ' left';
}

export function AccountSettingsScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const navigation = useNavigation<any>();
  const { signOut } = useAuthStore();
  const nickname = useAuthStore(s => s.nickname);
  const displayName = useAuthStore(s => s.displayName);
  const { settings, updateSettings, loadSettings } = useSettingsStore();
  const { billingStatus, loadBillingStatus } = useBillingStore();
  const { numbers, loadNumbers } = useTelephonyStore();
  const activeNumber = numbers.find((n) => n.status === 'active');
  const [numberRevealed, setNumberRevealed] = useState(false);
  const [showTzPicker, setShowTzPicker] = useState(false);
  const [tzSearch, setTzSearch] = useState('');

  const currentTz = settings?.timezone || getDeviceTimezone();

  const filteredSections = useMemo((): TimezoneSection[] => {
    if (!tzSearch.trim()) return TIMEZONE_SECTIONS;
    const q = tzSearch.toLowerCase();
    return TIMEZONE_SECTIONS
      .map(section => ({
        title: section.title,
        data: section.data.filter(
          (t) => t.value.toLowerCase().includes(q) || t.label.toLowerCase().includes(q) || t.offset.toLowerCase().includes(q),
        ),
      }))
      .filter(section => section.data.length > 0);
  }, [tzSearch]);

  async function handleTimezoneSelect(tz: string) {
    setShowTzPicker(false);
    setTzSearch('');
    if (tz !== currentTz) {
      const ok = await updateSettings({ timezone: tz });
      if (ok) {
        setToastType('info');
        setToast(`Timezone set to ${tz.split('/').pop()?.replace(/_/g, ' ')}`);
      } else {
        setToastType('error');
        setToast('Failed to save timezone. Please try again.');
      }
    }
  }

  useEffect(() => {
    loadBillingStatus();
    loadNumbers();
    useAuthStore.getState().loadProfile();
  }, [loadBillingStatus, loadNumbers]);

  useFocusEffect(
    React.useCallback(() => {
      useAuthStore.getState().loadProfile();
      loadSettings();
    }, [loadSettings]),
  );

  const subscriptionSubtitle = React.useMemo(() => {
    if (!billingStatus?.has_subscription || billingStatus.status !== 'active') {
      return 'No active plan';
    }
    const planName = (billingStatus.plan ?? 'Free').charAt(0).toUpperCase() + (billingStatus.plan ?? 'free').slice(1);
    if (!billingStatus.current_period_end) return planName;

    const endDate = new Date(billingStatus.current_period_end);
    let dateStr = endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZoneName: 'short', timeZone: currentTz });
    // Replace GMT offset with proper timezone abbreviation
    dateStr = dateStr.replace(/GMT[+-]\d{1,2}(?::\d{2})?/g, getTimezoneAbbr(currentTz));
    const countdown = formatTimeRemaining(endDate);
    const isCanceling = billingStatus.status === 'active' && billingStatus.cancel_at_period_end;
    const verb = isCanceling ? 'Ends' : 'Renews';
    return `${planName} · ${verb} ${dateStr} · ${countdown}`;
  }, [billingStatus, currentTz]);

  const [showLogoutAll, setShowLogoutAll] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'info' | 'error'>('info');

  const userName = displayName || nickname || null;
  const initial = userName ? userName.charAt(0).toUpperCase() : null;

  async function handleLogout() {
    try { await logout(); } catch { /* best-effort */ }
    await signOut();
  }

  async function handleLogoutAll() {
    try { await logoutAll(); } catch { /* best-effort */ }
    setShowLogoutAll(false);
    await signOut();
  }

  async function handleDeleteAccount() {
    setShowDeleteAccount(false);
    setDeleting(true);
    try {
      const stepUpData = await stepUp(undefined, undefined);
      await deleteAccount(stepUpData.step_up_token);
      await signOut();
    } catch (e: unknown) {
      setToastType('error');
      setToast(extractApiError(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ScreenWrapper>
      <Toast message={toast} type={toastType} visible={!!toast} onDismiss={() => setToast('')} />

      {/* Profile Header */}
      <View style={{ alignItems: 'center', marginBottom: spacing.xl, gap: spacing.md }}>
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: 38,
            padding: 3,
            ...Platform.select({
              ios: {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
              },
              android: { elevation: 6 },
            }),
          }}
        >
          <GradientView
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 70,
              height: 70,
              borderRadius: 35,
              padding: 3,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {initial ? (
                <Text style={{ fontSize: 24, fontWeight: '700', color: colors.primary }}>
                  {initial}
                </Text>
              ) : (
                <Icon name="account" size={32} color={colors.primary} />
              )}
            </View>
          </GradientView>
        </View>
        <Text style={{ ...typography.h2, color: colors.textPrimary }} allowFontScaling>
          {userName ?? 'User'}
        </Text>

        {/* AI Number */}
        {activeNumber ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs }}>
            <TouchableOpacity
              onPress={() => setNumberRevealed((prev) => !prev)}
              activeOpacity={0.7}
              accessibilityLabel={numberRevealed ? 'Tap to hide number' : 'Tap to reveal number'}
            >
              <Text style={{ ...typography.body, color: colors.textSecondary }}>
                {numberRevealed ? activeNumber.e164 : maskPhone(activeNumber.e164)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Clipboard.setString(activeNumber.e164);
                setToast('Copied');
                setToastType('info');
              }}
              activeOpacity={0.7}
              accessibilityLabel="Copy AI number"
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: colors.primary + '18',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="content-copy" size="sm" color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={{ ...typography.caption, color: colors.textDisabled, marginTop: spacing.xs }} allowFontScaling>
            No AI number
          </Text>
        )}
      </View>

      {/* ── Profile ────────────────────────────────── */}
      <View style={{ marginTop: spacing.xl, marginBottom: spacing.lg }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
          marginBottom: spacing.md, marginLeft: spacing.xs,
          borderLeftWidth: 3, borderLeftColor: colors.primary + '40', paddingLeft: spacing.sm,
        }}>
          <Icon name="account-outline" size="sm" color={colors.primary} />
          <Text
            style={{ ...typography.caption, color: colors.primary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 }}
            allowFontScaling
          >
            Profile
          </Text>
        </View>
        <View style={{ gap: spacing.sm }}>
          <ListRow
            icon="account-edit-outline"
            iconColor={colors.primary}
            title="Profile"
            subtitle="Name, nickname, company info, phone"
            onPress={() => navigation.navigate('ProfileSettings')}
            right={<Icon name="chevron-right" size="md" color={colors.textDisabled} />}
            accessibilityLabel="Edit profile"
          />
          <ListRow
            icon="earth"
            iconColor={colors.primary}
            title="Timezone"
            subtitle={tzLabel(currentTz)}
            onPress={() => setShowTzPicker(true)}
            right={<Icon name="chevron-right" size="md" color={colors.textDisabled} />}
            accessibilityLabel="Change timezone"
          />
        </View>
      </View>

      <Divider />

      {/* ── Billing ──────────────────────────────────── */}
      <View style={{ marginTop: spacing.xl, marginBottom: spacing.lg }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
          marginBottom: spacing.md, marginLeft: spacing.xs,
          borderLeftWidth: 3, borderLeftColor: colors.primary + '40', paddingLeft: spacing.sm,
        }}>
          <Icon name="credit-card-outline" size="sm" color={colors.primary} />
          <Text
            style={{ ...typography.caption, color: colors.primary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 }}
            allowFontScaling
          >
            Billing
          </Text>
        </View>
        <View style={{ gap: spacing.sm }}>
          <ListRow
            icon="credit-card-outline"
            iconColor={colors.primary}
            title="Subscription"
            subtitle={subscriptionSubtitle}
            onPress={() => navigation.navigate('SubscriptionStatus')}
            right={<Icon name="chevron-right" size="md" color={colors.textDisabled} />}
            accessibilityLabel="Manage subscription"
          />
        </View>
      </View>

      <Divider />

      {/* ── Privacy & Security ────────────────────── */}
      <View style={{ marginTop: spacing.xl, marginBottom: spacing.lg }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
          marginBottom: spacing.md, marginLeft: spacing.xs,
          borderLeftWidth: 3, borderLeftColor: colors.warning + '60', paddingLeft: spacing.sm,
        }}>
          <Icon name="shield-lock-outline" size="sm" color={colors.warning} />
          <Text
            style={{ ...typography.caption, color: colors.warning, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 }}
            allowFontScaling
          >
            Privacy & Security
          </Text>
        </View>
        <View style={{ gap: spacing.sm }}>
          <ListRow
            icon="shield-lock-outline"
            iconColor={colors.warning}
            title="Privacy & Security"
            subtitle="Password, PIN, MFA, devices, biometrics, recording"
            onPress={() => navigation.navigate('PrivacySettings')}
            right={<Icon name="chevron-right" size="md" color={colors.textDisabled} />}
            accessibilityLabel="Privacy and security settings"
          />
        </View>
      </View>

      <Divider />

      {/* ── Sessions ─────────────────────────────────── */}
      <View style={{ gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.xl }}>
        <Button
          title="Sign Out"
          icon="logout"
          onPress={handleLogout}
          variant="outline"
        />
        <Button
          title="Sign Out All Devices"
          icon="logout-variant"
          onPress={() => setShowLogoutAll(true)}
          variant="outline"
        />
      </View>

      <Divider />

      {/* ── Danger Zone ─────────────────────────────── */}
      <View style={{ marginTop: spacing.xl }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
          marginBottom: spacing.sm, marginLeft: spacing.xs,
          borderLeftWidth: 3, borderLeftColor: colors.error + '40', paddingLeft: spacing.sm,
        }}>
          <Icon name="alert-octagon-outline" size="sm" color={colors.error} />
          <Text
            style={{ ...typography.caption, color: colors.error, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 }}
            allowFontScaling
          >
            Danger Zone
          </Text>
        </View>
        <Button
          title="Delete Account"
          icon="trash-can-outline"
          onPress={() => setShowDeleteAccount(true)}
          variant="destructive"
        />
      </View>

      {/* App version */}
      <View style={{ marginTop: spacing.xxl, alignItems: 'center' }}>
        <Text style={{ ...typography.caption, color: colors.textDisabled }} allowFontScaling>
          MattBot v0.1.0
        </Text>
      </View>

      <ConfirmSheet
        visible={showLogoutAll}
        onDismiss={() => setShowLogoutAll(false)}
        icon="logout-variant"
        title="Sign out all devices?"
        message="This will revoke all active sessions. You'll need to sign in again on every device."
        confirmLabel="Sign Out All"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleLogoutAll}
      />

      <ConfirmSheet
        visible={showDeleteAccount}
        onDismiss={() => setShowDeleteAccount(false)}
        icon="trash-can-outline"
        title="Delete your account?"
        message="This action is permanent and cannot be undone. Your phone number, subscription, call history, and all account data will be permanently deleted."
        confirmLabel="Delete Account"
        cancelLabel="Keep Account"
        destructive
        onConfirm={handleDeleteAccount}
        loading={deleting}
      />

      {/* Timezone Picker Modal */}
      <Modal visible={showTzPicker} transparent animationType="slide" onRequestClose={() => setShowTzPicker(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}
          onPress={() => { setShowTzPicker(false); setTzSearch(''); }}
        >
          <Pressable
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
              maxHeight: '80%',
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.md }} />
              <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md }}>
                Select Timezone
              </Text>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
                backgroundColor: colors.surfaceVariant, borderRadius: radii.md,
                paddingHorizontal: spacing.md, marginBottom: spacing.md,
              }}>
                <Icon name="magnify" size={18} color={colors.textDisabled} />
                <RNTextInput
                  value={tzSearch}
                  onChangeText={setTzSearch}
                  placeholder="Search timezones..."
                  placeholderTextColor={colors.textDisabled}
                  style={{ flex: 1, ...typography.bodySmall, color: colors.textPrimary, paddingVertical: spacing.sm }}
                  autoFocus
                />
                {tzSearch ? (
                  <Pressable onPress={() => setTzSearch('')}>
                    <Icon name="close-circle" size={16} color={colors.textDisabled} />
                  </Pressable>
                ) : null}
              </View>
            </View>
            <SectionList
              sections={filteredSections}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: spacing.xxl }}
              stickySectionHeadersEnabled
              renderSectionHeader={({ section }) => (
                <View style={{
                  paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
                  backgroundColor: colors.surface,
                  borderBottomWidth: 1, borderBottomColor: colors.border,
                }}>
                  <Text style={{
                    ...typography.caption, fontWeight: '700',
                    color: colors.primary, textTransform: 'uppercase', letterSpacing: 1,
                  }}>
                    {section.title}
                  </Text>
                </View>
              )}
              renderItem={({ item }) => {
                const selected = item.value === currentTz;
                return (
                  <Pressable
                    onPress={() => handleTimezoneSelect(item.value)}
                    style={({ pressed }) => ({
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
                      backgroundColor: pressed ? colors.surfaceVariant : selected ? colors.primary + '10' : 'transparent',
                    })}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        ...typography.bodySmall, fontWeight: selected ? '700' : '400',
                        color: selected ? colors.primary : colors.textPrimary,
                      }}>
                        {item.label}
                      </Text>
                      <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: 1 }}>
                        {item.value} ({item.offset})
                      </Text>
                    </View>
                    {selected && <Icon name="check-circle" size={20} color={colors.primary} />}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                  <Text style={{ ...typography.body, color: colors.textSecondary }}>
                    No matching timezones
                  </Text>
                </View>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenWrapper>
  );
}
