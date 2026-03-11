import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useThemeContext, ThemeMode } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { hapticLight } from '../utils/haptics';

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
            onPress={() => { hapticLight(); onSelect(opt.value); }}
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

interface SettingsRow {
  icon: string;
  label: string;
  route?: string;
  color?: string;
}

interface SettingsSection {
  title: string;
  rows: SettingsRow[];
}

export function SettingsHubScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const { themeMode, setThemeMode } = useThemeContext();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const sections: SettingsSection[] = [
    {
      title: 'Assistant',
      rows: [
        { icon: 'robot-outline', label: 'AI Settings', route: 'AssistantSettings' },
        { icon: 'phone-settings-outline', label: 'Call Modes', route: 'CallModes' },
        { icon: 'clock-outline', label: 'Business Hours', route: 'BusinessHours' },
        { icon: 'emoticon-outline', label: 'Temperament', route: 'Temperament' },
        // Handoff hidden until feature is fully wired up
        // { icon: 'phone-forward-outline', label: 'Handoff', route: 'HandoffSettings' },
      ],
    },
    {
      title: 'Phone',
      rows: [
        { icon: 'phone-outline', label: 'My Numbers', route: 'NumberProvision' },
        { icon: 'phone-forward-outline', label: 'Forwarding', route: 'ForwardingSetupGuide' },
        { icon: 'star-outline', label: 'VIP List', route: 'VipList' },
        { icon: 'block-helper', label: 'Block List', route: 'BlockList' },
      ],
    },
    {
      title: 'Notifications',
      rows: [
        { icon: 'moon-waning-crescent', label: 'Quiet Hours', route: 'QuietHours' },
        { icon: 'bell-alert-outline', label: 'Urgent Notifications', route: 'UrgentNotifications' },
      ],
    },
    {
      title: 'Contacts & Memory',
      rows: [
        { icon: 'account-group-outline', label: 'Contacts', route: 'ContactsList' },
        { icon: 'tag-outline', label: 'Category Defaults', route: 'CategoryDefaults' },
        { icon: 'brain', label: 'Memory', route: 'MemoryList' },
      ],
    },
    {
      title: 'Calendar',
      rows: [
        { icon: 'calendar-outline', label: 'Calendar Integration', route: 'Calendar' },
        { icon: 'calendar-clock', label: 'Booking Settings', route: 'CalendarBookingSettings' },
      ],
    },
    {
      title: 'Billing',
      rows: [
        { icon: 'credit-card-outline', label: 'Subscription', route: 'SubscriptionStatus' },
        { icon: 'wallet-outline', label: 'Payment Methods', route: 'PaymentMethodsList' },
        { icon: 'swap-horizontal', label: 'Manage Plan', route: 'ManageSubscription' },
      ],
    },
    {
      title: 'Privacy & Security',
      rows: [
        { icon: 'shield-lock-outline', label: 'Privacy Settings', route: 'PrivacySettings' },
        { icon: 'database-lock-outline', label: 'Memory Settings', route: 'MemorySettings' },
      ],
    },
  ];

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
        <Icon name="cog-outline" size={28} color={colors.textPrimary} />
        <Text style={{ ...typography.h1, color: colors.textPrimary, marginLeft: spacing.sm }}>
          Settings
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        <FadeIn delay={0} slide="up">
          <View>
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
              Appearance
            </Text>
            <View
              style={{
                marginHorizontal: spacing.lg,
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.cardBorder,
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

        {sections.map((section, sIdx) => (
          <FadeIn key={section.title} delay={(sIdx + 1) * 40} slide="up">
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
                {section.title}
              </Text>

              <View
                style={{
                  marginHorizontal: spacing.lg,
                  backgroundColor: colors.surface,
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  overflow: 'hidden',
                }}
              >
                {section.rows.map((row, rIdx) => {
                  const isLast = rIdx === section.rows.length - 1;

                  return (
                    <Pressable
                      key={row.label}
                      onPress={() => row.route && navigation.navigate(row.route)}
                      disabled={!row.route}
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
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: (row.color || colors.primary) + '18',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon name={row.icon} size={18} color={row.color || colors.primary} />
                      </View>
                      <Text
                        style={{
                          ...typography.body,
                          color: row.color || colors.textPrimary,
                          flex: 1,
                          marginLeft: spacing.md,
                        }}
                      >
                        {row.label}
                      </Text>
                      {row.route && (
                        <Icon name="chevron-right" size={20} color={colors.textSecondary} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </FadeIn>
        ))}
      </ScrollView>
    </View>
  );
}
