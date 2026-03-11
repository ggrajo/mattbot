import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useThemeContext, ThemeMode } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { GlassCard } from '../components/ui/GlassCard';
import { SettingsSection, SettingsRowItem } from '../components/ui/SettingsSection';
import { FadeIn } from '../components/ui/FadeIn';
import { hapticLight } from '../utils/haptics';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'system', label: 'Auto', icon: 'cellphone' },
  { value: 'light', label: 'Light', icon: 'white-balance-sunny' },
  { value: 'dark', label: 'Dark', icon: 'moon-waning-crescent' },
];

export function SettingsHubScreen() {
  const theme = useTheme();
  const { colors, spacing, radii } = theme;
  const { themeMode, setThemeMode } = useThemeContext();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const sections: { title: string; rows: SettingsRowItem[] }[] = [
    {
      title: 'Assistant',
      rows: [
        { icon: 'robot-outline', label: 'AI Settings', onPress: () => navigation.navigate('AssistantSettings') },
        { icon: 'phone-settings-outline', label: 'Call Modes', onPress: () => navigation.navigate('CallModes') },
        { icon: 'clock-outline', label: 'Business Hours', onPress: () => navigation.navigate('BusinessHours') },
      ],
    },
    {
      title: 'Phone',
      rows: [
        { icon: 'phone-outline', label: 'My Numbers', onPress: () => navigation.navigate('NumberProvision') },
        { icon: 'phone-forward-outline', label: 'Forwarding', onPress: () => navigation.navigate('ForwardingSetupGuide') },
        { icon: 'star-outline', label: 'VIP List', onPress: () => navigation.navigate('VipList') },
        { icon: 'block-helper', label: 'Block List', onPress: () => navigation.navigate('BlockList') },
      ],
    },
    {
      title: 'Notifications',
      rows: [
        { icon: 'moon-waning-crescent', label: 'Quiet Hours', onPress: () => navigation.navigate('QuietHours') },
        { icon: 'bell-alert-outline', label: 'Urgent Notifications', onPress: () => navigation.navigate('UrgentNotifications') },
      ],
    },
    {
      title: 'Contacts & Memory',
      rows: [
        { icon: 'account-group-outline', label: 'Contacts', onPress: () => navigation.navigate('ContactsList') },
        { icon: 'tag-outline', label: 'Category Defaults', onPress: () => navigation.navigate('CategoryDefaults') },
        { icon: 'brain', label: 'Memory', onPress: () => navigation.navigate('MemoryList') },
      ],
    },
    {
      title: 'Calendar',
      rows: [
        { icon: 'calendar-outline', label: 'Calendar Integration', onPress: () => navigation.navigate('Calendar') },
        { icon: 'calendar-clock', label: 'Booking Settings', onPress: () => navigation.navigate('CalendarBookingSettings') },
      ],
    },
    {
      title: 'Billing',
      rows: [
        { icon: 'credit-card-outline', label: 'Subscription', onPress: () => navigation.navigate('SubscriptionStatus') },
        { icon: 'wallet-outline', label: 'Payment Methods', onPress: () => navigation.navigate('PaymentMethodsList') },
        { icon: 'swap-horizontal', label: 'Manage Plan', onPress: () => navigation.navigate('ManageSubscription') },
      ],
    },
    {
      title: 'Privacy & Security',
      rows: [
        { icon: 'shield-lock-outline', label: 'Privacy Settings', onPress: () => navigation.navigate('PrivacySettings') },
        { icon: 'database-lock-outline', label: 'Memory Settings', onPress: () => navigation.navigate('MemorySettings') },
      ],
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 40 }}
      >
        {/* Header */}
        <FadeIn delay={0} slide="down">
          <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={12}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: colors.primary + '15',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: spacing.md,
                }}
              >
                <Icon name="arrow-left" size={20} color={colors.primary} />
              </Pressable>
              <Text style={{ fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 }}>Settings</Text>
            </View>
          </View>
        </FadeIn>

        {/* Theme Selector */}
        <FadeIn delay={30}>
          <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
            <GlassCard padding={spacing.md}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm }}>
                Appearance
              </Text>
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

        {/* All sections */}
        {sections.map((section, sIdx) => (
          <FadeIn key={section.title} delay={60 + sIdx * 30}>
            <SettingsSection title={section.title} rows={section.rows} />
          </FadeIn>
        ))}
      </ScrollView>
    </View>
  );
}
