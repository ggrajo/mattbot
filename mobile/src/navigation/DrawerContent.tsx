import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { Icon } from '../components/ui/Icon';
import { Divider } from '../components/ui/Divider';
import { ConfirmSheet } from '../components/ui/ConfirmSheet';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import { logout, logoutAll } from '../api/auth';

interface DrawerItem {
  key: string;
  label: string;
  icon: string;
  route: string;
  iconColor?: string;
}

const MENU_ITEMS: DrawerItem[] = [
  { key: 'home', label: 'Home', icon: 'home-outline', route: 'HomeTab' },
  { key: 'subscription', label: 'Subscription', icon: 'credit-card-outline', route: 'SubscriptionTab' },
  { key: 'callModes', label: 'Call Modes', icon: 'phone-outline', route: 'CallModesTab' },
  { key: 'devices', label: 'Devices', icon: 'devices', route: 'DevicesTab' },
  { key: 'settings', label: 'Settings', icon: 'cog-outline', route: 'SettingsTab' },
  { key: 'account', label: 'Account', icon: 'account-circle-outline', route: 'AccountTab' },
];

export function DrawerContent({ navigation, state }: DrawerContentComponentProps) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const { signOut } = useAuthStore();
  const [showLogoutAll, setShowLogoutAll] = useState(false);

  const activeRoute = state.routes[state.index]?.name;

  async function handleLogout() {
    try { await logout(); } catch { /* best-effort */ }
    await signOut();
  }

  async function handleLogoutAll() {
    try { await logoutAll(); } catch { /* best-effort */ }
    setShowLogoutAll(false);
    await signOut();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header / branding */}
      <View
        style={{
          paddingTop: 56,
          paddingBottom: spacing.xl,
          paddingHorizontal: spacing.xl,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: radii.xl,
              backgroundColor: colors.primary + '14',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="phone-check-outline" size="lg" color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.h3, color: colors.textPrimary }} allowFontScaling>
              MattBot
            </Text>
            <Text style={{ ...typography.caption, color: colors.textSecondary }} allowFontScaling>
              AI Call Concierge
            </Text>
          </View>
        </View>
      </View>

      {/* Menu items */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: spacing.md }}
        showsVerticalScrollIndicator={false}
      >
        {MENU_ITEMS.map((item) => {
          const isActive = activeRoute === item.route;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => navigation.navigate(item.route)}
              activeOpacity={0.7}
              accessibilityRole="menuitem"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isActive }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                marginHorizontal: spacing.md,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
                borderRadius: radii.md,
                backgroundColor: isActive ? colors.primary + '14' : 'transparent',
              }}
            >
              <Icon
                name={item.icon}
                size="md"
                color={isActive ? colors.primary : colors.textSecondary}
              />
              <Text
                style={{
                  ...typography.body,
                  color: isActive ? colors.primary : colors.textPrimary,
                  fontWeight: isActive ? '600' : '400',
                }}
                allowFontScaling
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        <View style={{ paddingHorizontal: spacing.xl }}>
          <Divider />
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.7}
          accessibilityRole="menuitem"
          accessibilityLabel="Sign Out"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            marginHorizontal: spacing.md,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            borderRadius: radii.md,
          }}
        >
          <Icon name="logout" size="md" color={colors.textSecondary} />
          <Text style={{ ...typography.body, color: colors.textPrimary }} allowFontScaling>
            Sign Out
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowLogoutAll(true)}
          activeOpacity={0.7}
          accessibilityRole="menuitem"
          accessibilityLabel="Sign Out All Devices"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            marginHorizontal: spacing.md,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            borderRadius: radii.md,
          }}
        >
          <Icon name="logout-variant" size="md" color={colors.error} />
          <Text style={{ ...typography.body, color: colors.error }} allowFontScaling>
            Sign Out All Devices
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* App version */}
      <View style={{ paddingVertical: spacing.md, alignItems: 'center' }}>
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
    </View>
  );
}
