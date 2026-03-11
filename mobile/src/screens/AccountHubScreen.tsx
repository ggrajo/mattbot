import React, { useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useThemeContext, ThemeMode } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { GlassCard } from '../components/ui/GlassCard';
import { GradientView } from '../components/ui/GradientView';
import { SettingsSection, SettingsRowItem } from '../components/ui/SettingsSection';
import { FadeIn } from '../components/ui/FadeIn';
import { useAuthStore } from '../store/authStore';
import { hapticLight } from '../utils/haptics';
import { deleteAccount } from '../api/auth';
import { extractApiError } from '../api/client';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'system', label: 'Auto', icon: 'cellphone' },
  { value: 'light', label: 'Light', icon: 'white-balance-sunny' },
  { value: 'dark', label: 'Dark', icon: 'moon-waning-crescent' },
];

export function AccountHubScreen() {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const { themeMode, setThemeMode } = useThemeContext();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const displayName = useAuthStore((s) => s.displayName);
  const nickname = useAuthStore((s) => s.nickname);
  const signOut = useAuthStore((s) => s.signOut);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  }, [signOut]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'This cannot be reversed.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAccount();
                      signOut();
                    } catch (e) {
                      Alert.alert('Error', extractApiError(e) || 'Failed to delete account');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, []);

  const userLabel = displayName || nickname || 'User';
  const initial = userLabel.charAt(0).toUpperCase();

  const accountRows: SettingsRowItem[] = [
    { icon: 'account-outline', label: 'Profile', onPress: () => navigation.navigate('ProfileSettings') },
    { icon: 'lock-outline', label: 'Change Password', onPress: () => navigation.navigate('ChangePassword') },
    { icon: 'pin-outline', label: 'PIN Setup', onPress: () => navigation.navigate('PinSetup') },
    { icon: 'cellphone-link', label: 'Devices', onPress: () => navigation.navigate('DeviceList') },
  ];

  const quickAccessRows: SettingsRowItem[] = [
    { icon: 'bell-outline', label: 'Reminders', onPress: () => navigation.navigate('RemindersList') },
    { icon: 'credit-card-outline', label: 'Payment Methods', onPress: () => navigation.navigate('PaymentMethodsList') },
    { icon: 'cog-outline', label: 'All Settings', onPress: () => navigation.navigate('SettingsHub') },
  ];

  const dangerRows: SettingsRowItem[] = [
    { icon: 'logout', label: 'Sign Out', destructive: true, onPress: handleSignOut },
    { icon: 'delete-outline', label: 'Delete Account', destructive: true, onPress: handleDeleteAccount },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 40 }}
      >
        {/* Profile Header */}
        <FadeIn delay={0} slide="down">
          <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.xl }}>
            <GlassCard>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <GradientView
                  colors={[colors.gradientStart, colors.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    ...Platform.select({
                      ios: { shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
                      android: { elevation: 4 },
                    }),
                  }}
                >
                  <Text style={{ fontSize: 24, fontWeight: '800', color: '#FFFFFF' }}>{initial}</Text>
                </GradientView>
                <View style={{ flex: 1, marginLeft: spacing.lg }}>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary }}>{userLabel}</Text>
                  {nickname && displayName && (
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>@{nickname}</Text>
                  )}
                </View>
                <Pressable
                  onPress={() => { hapticLight(); navigation.navigate('ProfileSettings'); }}
                  hitSlop={8}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: colors.primary + '15',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="pencil-outline" size={18} color={colors.primary} />
                </Pressable>
              </View>
            </GlassCard>
          </View>
        </FadeIn>

        {/* Theme Selector */}
        <FadeIn delay={30}>
          <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
            <GlassCard padding={spacing.md}>
              <View style={{ flexDirection: 'row' }}>
                {THEME_OPTIONS.map((opt, idx) => {
                  const active = themeMode === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => { hapticLight(); setThemeMode(opt.value); }}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 10,
                        borderRadius: 14,
                        backgroundColor: active ? colors.primary : 'transparent',
                        marginRight: idx < THEME_OPTIONS.length - 1 ? 6 : 0,
                      }}
                    >
                      <Icon name={opt.icon} size={16} color={active ? '#FFFFFF' : colors.textSecondary} />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#FFFFFF' : colors.textSecondary, marginLeft: 6 }}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </GlassCard>
          </View>
        </FadeIn>

        {/* Sections */}
        <FadeIn delay={60}>
          <SettingsSection title="Account" rows={accountRows} />
        </FadeIn>
        <FadeIn delay={90}>
          <SettingsSection title="Quick Access" rows={quickAccessRows} />
        </FadeIn>
        <FadeIn delay={120}>
          <SettingsSection title="Danger Zone" rows={dangerRows} />
        </FadeIn>

        {/* Version */}
        <FadeIn delay={150}>
          <Text style={{ fontSize: 12, color: colors.textDisabled, textAlign: 'center', marginTop: spacing.xl }}>
            MattBot v1.0.0
          </Text>
        </FadeIn>
      </ScrollView>
    </View>
  );
}
