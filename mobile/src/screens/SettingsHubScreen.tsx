import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../components/ui/Card';
import { ListRow } from '../components/ui/ListRow';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import { logout } from '../api/auth';

export function SettingsHubScreen() {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;
  const navigation = useNavigation<any>();
  const signOut = useAuthStore((s) => s.signOut);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch {
              // Ignore API errors; still clear local state
            }
            await signOut();
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data will be erased.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn delay={0}>
          <Text style={[typography.h1, { color: colors.textPrimary, marginBottom: spacing.xl }]}>
            Settings
          </Text>
        </FadeIn>

        <FadeIn delay={60}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>ACCOUNT</Text>
          <Card>
            <ListRow
              icon="👤"
              label="Profile Settings"
              hint="Edit display name, timezone, language"
              onPress={() => navigation.navigate('ProfileSettings')}
            />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <ListRow
              icon="🔑"
              label="Change Password"
              hint="Update your password"
              onPress={() => navigation.navigate('ChangePassword')}
            />
          </Card>
        </FadeIn>

        <FadeIn delay={100}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>AI ASSISTANT</Text>
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

        <FadeIn delay={140}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>PHONE & CALLS</Text>
          <Card>
            <ListRow
              icon="📞"
              label="Phone Number"
              hint="Manage your MattBot number"
              onPress={() => navigation.navigate('NumberProvision')}
            />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <ListRow
              icon="🔀"
              label="Call Modes"
              hint="Screening, forwarding rules"
              onPress={() => navigation.navigate('CallModes')}
            />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <ListRow
              icon="📋"
              label="Screening Defaults"
              hint="Category call rules"
              onPress={() => navigation.navigate('CategoryDefaults')}
            />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <ListRow
              icon="↔️"
              label="Handoff"
              hint="Transfer calls to you"
              onPress={() => navigation.navigate('HandoffSettings')}
            />
          </Card>
        </FadeIn>

        <FadeIn delay={180}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>NOTIFICATIONS</Text>
          <Card>
            <ListRow
              icon="🔕"
              label="Quiet Hours"
              hint="Do not disturb schedule"
              onPress={() => navigation.navigate('QuietHours')}
            />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <ListRow
              icon="🚨"
              label="Urgent Notifications"
              hint="Break-through alerts"
              onPress={() => navigation.navigate('UrgentNotifications')}
            />
          </Card>
        </FadeIn>

        <FadeIn delay={220}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
            CONTACTS & MEMORY
          </Text>
          <Card>
            <ListRow
              icon="👥"
              label="Contacts"
              hint="Manage callers"
              onPress={() => navigation.navigate('ContactsList')}
            />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <ListRow
              icon="⭐"
              label="VIP List"
              hint="Priority callers"
              onPress={() => navigation.navigate('VipList')}
            />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <ListRow
              icon="🚫"
              label="Block List"
              hint="Blocked numbers"
              onPress={() => navigation.navigate('BlockList')}
            />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <ListRow
              icon="🧠"
              label="AI Memory"
              hint="Assistant memory settings"
              onPress={() => navigation.navigate('MemoryList')}
            />
          </Card>
        </FadeIn>

        <FadeIn delay={260}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>CALENDAR</Text>
          <Card>
            <ListRow
              icon="📅"
              label="Calendar Settings"
              hint="Google Calendar booking"
              onPress={() => navigation.navigate('CalendarBookingSettings')}
            />
          </Card>
        </FadeIn>

        <FadeIn delay={300}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>BILLING</Text>
          <Card>
            <ListRow
              icon="💳"
              label="Subscription"
              hint="View subscription details"
              onPress={() => navigation.navigate('SubscriptionStatus')}
            />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <ListRow
              icon="💰"
              label="Payment Methods"
              hint="Manage cards & billing"
              onPress={() => navigation.navigate('PaymentMethodsList')}
            />
          </Card>
        </FadeIn>

        <FadeIn delay={340}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
            PRIVACY & SECURITY
          </Text>
          <Card>
            <ListRow
              icon="🔒"
              label="Privacy"
              hint="Caller ID, recordings, transcripts"
              onPress={() => navigation.navigate('PrivacySettings')}
            />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <ListRow
              icon="🔐"
              label="PIN Setup"
              hint="Set up app PIN"
              onPress={() => navigation.navigate('PinSetup')}
            />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <ListRow
              icon="📱"
              label="Devices"
              hint="Manage linked devices"
              onPress={() => navigation.navigate('DeviceList')}
            />
          </Card>
        </FadeIn>

        <FadeIn delay={380}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>ABOUT</Text>
          <Card>
            <View style={styles.aboutRow}>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Version</Text>
              <Text style={[typography.bodySmall, { color: colors.textPrimary, fontWeight: '600' }]}>
                1.0.0
              </Text>
            </View>
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <View style={styles.aboutRow}>
              <Text style={[typography.bodySmall, { color: colors.textSecondary }]}>Build</Text>
              <Text style={[typography.bodySmall, { color: colors.textPrimary, fontWeight: '600' }]}>
                Phase 12
              </Text>
            </View>
          </Card>
        </FadeIn>

        <FadeIn delay={420}>
          <TouchableOpacity
            style={[styles.logoutButton, { borderColor: colors.error }]}
            activeOpacity={0.7}
            onPress={handleSignOut}
          >
            <Text style={[typography.button, { color: colors.error }]}>Sign Out</Text>
          </TouchableOpacity>
        </FadeIn>

        <FadeIn delay={440}>
          <TouchableOpacity
            style={[styles.deleteButton, { borderColor: colors.error }]}
            activeOpacity={0.7}
            onPress={handleDeleteAccount}
          >
            <Text style={[typography.button, { color: colors.error }]}>Delete Account</Text>
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
  deleteButton: {
    marginTop: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
