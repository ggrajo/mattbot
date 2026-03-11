import React, { useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useThemeContext, ThemeMode } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { useAuthStore } from '../store/authStore';
import { deleteAccount } from '../api/auth';
import { extractApiError } from '../api/client';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function ThemeToggle({
  themeMode,
  onSelect,
  colors,
  spacing,
  typography,
  radii,
}: {
  themeMode: ThemeMode;
  onSelect: (mode: ThemeMode) => void;
  colors: ReturnType<typeof useTheme>['colors'];
  spacing: ReturnType<typeof useTheme>['spacing'];
  typography: ReturnType<typeof useTheme>['typography'];
  radii: ReturnType<typeof useTheme>['radii'];
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surfaceVariant,
        borderRadius: radii.full,
        padding: 3,
      }}
    >
      {THEME_OPTIONS.map((opt) => {
        const active = themeMode === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              borderRadius: radii.full,
              alignItems: 'center',
              backgroundColor: active ? colors.primary : 'transparent',
            }}
          >
            <Text
              style={{
                ...typography.bodySmall,
                fontWeight: '600',
                color: active ? '#FFFFFF' : colors.textSecondary,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface AccountRow {
  icon: string;
  label: string;
  route?: string;
  color?: string;
  action?: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface AccountSection {
  title: string;
  rows: AccountRow[];
}

export function AccountHubScreen() {
  const { colors, spacing, typography, radii } = useTheme();
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
              'This cannot be reversed. Your account and all associated data will be permanently removed.',
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

  const sections: AccountSection[] = [
    {
      title: 'Account',
      rows: [
        { icon: 'account-outline', label: 'Profile', route: 'ProfileSettings' },
        { icon: 'lock-outline', label: 'Change Password', route: 'ChangePassword' },
        { icon: 'pin-outline', label: 'PIN Setup', route: 'PinSetup' },
        { icon: 'cellphone-link', label: 'Devices', route: 'DeviceList' },
        { icon: 'bell-outline', label: 'Reminders', route: 'RemindersList' },
        { icon: 'cog-outline', label: 'Settings', route: 'SettingsHub' },
        { icon: 'credit-card-outline', label: 'Payment Methods', route: 'PaymentMethodsList' },
      ],
    },
    {
      title: 'About',
      rows: [
        { icon: 'information-outline', label: 'App Version 1.0.0', color: colors.textSecondary, disabled: true },
      ],
    },
    {
      title: 'Danger Zone',
      rows: [
        { icon: 'logout', label: 'Sign Out', destructive: true, action: handleSignOut },
        { icon: 'delete-outline', label: 'Delete Account', destructive: true, action: handleDeleteAccount },
      ],
    },
  ];

  function handleRowPress(row: AccountRow) {
    if (row.action) {
      row.action();
    } else if (row.route) {
      navigation.navigate(row.route);
    }
  }

  const userLabel = displayName || nickname || 'User';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.md,
        }}
      >
        <Icon name="account-outline" size={28} color={colors.textPrimary} />
        <Text style={{ ...typography.h1, color: colors.textPrimary, marginLeft: spacing.sm }}>
          Account
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <FadeIn delay={0}>
          <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: colors.surfaceVariant,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.md,
              }}
            >
              <Icon name="account" size={40} color={colors.primary} />
            </View>
            <Text style={{ ...typography.h2, color: colors.textPrimary }}>{userLabel}</Text>
            {nickname && displayName && (
              <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: 2 }}>
                @{nickname}
              </Text>
            )}
          </View>
        </FadeIn>

        {sections.map((section, sIdx) => (
          <React.Fragment key={section.title}>
            {section.title === 'Danger Zone' && (
              <FadeIn delay={(sIdx + 1) * 30}>
                <View style={{ marginTop: spacing.lg }}>
                  <Text
                    style={{
                      ...typography.caption,
                      fontWeight: '600',
                      color: colors.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                      paddingHorizontal: spacing.lg,
                      marginBottom: spacing.xs,
                    }}
                  >
                    Preferences
                  </Text>
                  <View
                    style={{
                      marginHorizontal: spacing.lg,
                      backgroundColor: colors.surface,
                      borderRadius: radii.lg,
                      borderWidth: 1,
                      borderColor: colors.border,
                      overflow: 'hidden',
                      padding: spacing.lg,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                      <Icon name="theme-light-dark" size={20} color={colors.primary} />
                      <Text style={{ ...typography.body, color: colors.textPrimary, marginLeft: spacing.md }}>
                        Theme
                      </Text>
                    </View>
                    <ThemeToggle
                      themeMode={themeMode}
                      onSelect={setThemeMode}
                      colors={colors}
                      spacing={spacing}
                      typography={typography}
                      radii={radii}
                    />
                  </View>
                </View>
              </FadeIn>
            )}
            <FadeIn delay={(sIdx + 1) * 30}>
              <View style={{ marginTop: sIdx === 0 ? 0 : spacing.lg }}>
                <Text
                  style={{
                    ...typography.caption,
                    fontWeight: '600',
                    color: colors.textSecondary,
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    paddingHorizontal: spacing.lg,
                    marginBottom: spacing.xs,
                  }}
                >
                  {section.title}
                </Text>

                <View
                  style={{
                    marginHorizontal: spacing.lg,
                    backgroundColor: colors.surface,
                    borderRadius: radii.lg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    overflow: 'hidden',
                  }}
                >
                  {section.rows.map((row, rIdx) => {
                    const isLast = rIdx === section.rows.length - 1;
                    const rowColor = row.destructive
                      ? colors.error
                      : row.color || colors.textPrimary;
                    const iconColor = row.destructive
                      ? colors.error
                      : row.color || colors.primary;
                    const showChevron = !row.destructive && !row.disabled && (!!row.route || !!row.action);

                    return (
                      <Pressable
                        key={row.label}
                        onPress={() => handleRowPress(row)}
                        disabled={row.disabled || (!row.route && !row.action)}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: spacing.md,
                          paddingHorizontal: spacing.lg,
                          backgroundColor: pressed ? colors.surfaceVariant : 'transparent',
                          borderBottomWidth: isLast ? 0 : 1,
                          borderBottomColor: colors.border,
                        })}
                      >
                        <Icon name={row.icon} size={20} color={iconColor} />
                        <Text
                          style={{
                            ...typography.body,
                            color: rowColor,
                            flex: 1,
                            marginLeft: spacing.md,
                          }}
                        >
                          {row.label}
                        </Text>
                        {showChevron && (
                          <Icon name="chevron-right" size={20} color={colors.textSecondary} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </FadeIn>
          </React.Fragment>
        ))}
      </ScrollView>
    </View>
  );
}
