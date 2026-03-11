import React from 'react';
import { View, Text, SafeAreaView, Pressable, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../components/ui/Card';
import { ListRow } from '../components/ui/ListRow';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme, useThemeContext } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';

type ThemeMode = 'system' | 'light' | 'dark';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function SettingsScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const { themeMode, setThemeMode } = useThemeContext();
  const navigation = useNavigation<any>();
  const logout = useAuthStore((s) => s.logout);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn delay={0}>
          <Text style={[typography.h1, { color: colors.textPrimary, marginBottom: spacing.xl }]}>Settings</Text>
        </FadeIn>

        <FadeIn delay={60}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>APPEARANCE</Text>
          <Card>
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: colors.surfaceVariant,
                borderRadius: radii.md,
                padding: spacing.xs,
              }}
            >
              {THEME_OPTIONS.map((option) => {
                const active = themeMode === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setThemeMode(option.value)}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      paddingVertical: spacing.sm,
                      borderRadius: radii.sm,
                      backgroundColor: active ? colors.primary : 'transparent',
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${option.label} theme`}
                  >
                    <Text
                      style={{
                        ...typography.button,
                        color: active ? colors.onPrimary : colors.textSecondary,
                        fontSize: 14,
                      }}
                      allowFontScaling
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        </FadeIn>

        <FadeIn delay={120}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>ASSISTANT</Text>
          <Card>
            <ListRow
              icon="🤖"
              label="Assistant"
              hint="AI persona & behavior"
              onPress={() => navigation.navigate('OnboardingAssistantSetup')}
            />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <ListRow
              icon="🎭"
              label="Temperament"
              hint="Communication style"
              onPress={() => navigation.navigate('Temperament')}
            />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <ListRow
              icon="🕐"
              label="Business Hours"
              hint="Availability schedule"
              onPress={() => navigation.navigate('BusinessHours')}
            />
          </Card>
        </FadeIn>

        <FadeIn delay={180}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>ACCOUNT</Text>
          <Card>
            <ListRow
              icon="👤"
              label="Account Settings"
              hint="Profile, password, security"
              onPress={() => navigation.navigate('AccountSettings')}
            />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <ListRow
              icon="💳"
              label="Subscription"
              hint="Manage your plan"
              onPress={() => navigation.navigate('SubscriptionStatus')}
            />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <ListRow
              icon="📱"
              label="Devices"
              hint="Manage linked devices"
              onPress={() => navigation.navigate('DeviceList')}
            />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <ListRow
              icon="📅"
              label="Calendar"
              hint="Google Calendar booking"
              onPress={() => navigation.navigate('CalendarBookingSettings')}
            />
          </Card>
        </FadeIn>

        <FadeIn delay={240}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>NOTIFICATIONS</Text>
          <Card>
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
              Notification preferences can be configured in your device's system settings.
            </Text>
          </Card>
        </FadeIn>

        <FadeIn delay={300}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>ABOUT</Text>
          <Card>
            <View style={styles.aboutRow}>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Version</Text>
              <Text style={[typography.bodySmall, { color: colors.textPrimary, fontWeight: '600' }]}>1.0.0</Text>
            </View>
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <View style={styles.aboutRow}>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Build</Text>
              <Text style={[typography.bodySmall, { color: colors.textPrimary, fontWeight: '600' }]}>Phase 9</Text>
            </View>
          </Card>
        </FadeIn>

        <FadeIn delay={360}>
          <TouchableOpacity
            style={[styles.logoutButton, { borderColor: colors.error }]}
            activeOpacity={0.7}
            onPress={logout}
          >
            <Text style={[typography.button, { color: colors.error }]}>Sign Out</Text>
          </TouchableOpacity>
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 8,
    marginLeft: 4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  logoutButton: {
    marginTop: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
