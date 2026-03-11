import React from 'react';
import { View, Text, SafeAreaView, Pressable, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../components/ui/Card';
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
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Appearance</Text>
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
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Account</Text>
            <SettingsRow
              label="Subscription"
              hint="Manage your plan"
              onPress={() => navigation.navigate('SubscriptionStatus')}
              colors={colors}
              typography={typography}
            />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <SettingsRow
              label="Devices"
              hint="Manage linked devices"
              onPress={() => navigation.navigate('DeviceList')}
              colors={colors}
              typography={typography}
            />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <SettingsRow
              label="Assistant"
              hint="AI persona & behavior"
              onPress={() => navigation.navigate('OnboardingAssistantSetup')}
              colors={colors}
              typography={typography}
            />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <SettingsRow
              label="Calendar"
              hint="Google Calendar booking"
              onPress={() => navigation.navigate('CalendarBookingSettings')}
              colors={colors}
              typography={typography}
            />
          </Card>
        </FadeIn>

        <FadeIn delay={180}>
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Notifications</Text>
            <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>
              Notification preferences can be configured in your device's system settings.
            </Text>
          </Card>
        </FadeIn>

        <FadeIn delay={240}>
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>About</Text>
            <View style={styles.aboutRow}>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Version</Text>
              <Text style={[typography.bodySmall, { color: colors.textPrimary, fontWeight: '600' }]}>1.0.0</Text>
            </View>
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <View style={styles.aboutRow}>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Build</Text>
              <Text style={[typography.bodySmall, { color: colors.textPrimary, fontWeight: '600' }]}>Phase 6</Text>
            </View>
          </Card>
        </FadeIn>

        <FadeIn delay={300}>
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

function SettingsRow({
  label,
  hint,
  onPress,
  colors,
  typography,
}: {
  label: string;
  hint: string;
  onPress: () => void;
  colors: any;
  typography: any;
}) {
  return (
    <TouchableOpacity style={rowStyles.row} onPress={onPress} activeOpacity={0.6}>
      <View style={{ flex: 1 }}>
        <Text style={[typography.body, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>{hint}</Text>
      </View>
      <Text style={{ color: colors.textDisabled, fontSize: 18, fontWeight: '600' }}>›</Text>
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
});

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  logoutButton: {
    marginTop: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
