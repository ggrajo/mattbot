import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../components/ui/Card';
import { ListRow } from '../components/ui/ListRow';
import { FadeIn } from '../components/ui/FadeIn';
import { Button } from '../components/ui/Button';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';

export function AccountHubScreen() {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;
  const navigation = useNavigation<any>();
  const logout = useAuthStore((s) => s.logout);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data will be erased.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {} },
      ],
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
            Account
          </Text>
        </FadeIn>

        <FadeIn delay={60}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>PROFILE</Text>
          <Card>
            <View style={styles.profileRow}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>M</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>
                  MattBot User
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                  user@example.com
                </Text>
              </View>
              <TouchableOpacity>
                <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: '600' }]}>
                  Edit
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </FadeIn>

        <FadeIn delay={120}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>SUBSCRIPTION</Text>
          <Card>
            <ListRow
              icon="💳"
              label="Current Plan"
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

        <FadeIn delay={180}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>SECURITY</Text>
          <Card>
            <ListRow
              icon="🔑"
              label="Change Password"
              hint="Update your password"
              onPress={() => {}}
            />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <ListRow
              icon="🔒"
              label="PIN Lock"
              hint="Set up app PIN"
              onPress={() => navigation.navigate('PinSetup')}
            />
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <ListRow
              icon="👆"
              label="Biometric Unlock"
              hint="Use fingerprint or face ID"
              showChevron={false}
              trailing={
                <Switch
                  value={biometricEnabled}
                  onValueChange={setBiometricEnabled}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              }
            />
          </Card>
        </FadeIn>

        <FadeIn delay={240}>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>DANGER ZONE</Text>
          <Card style={{ borderColor: colors.error }}>
            <Text style={[typography.bodySmall, { color: colors.textSecondary, marginBottom: spacing.md }]}>
              Permanently delete your account and all associated data. This cannot be undone.
            </Text>
            <Button
              title="Delete Account"
              variant="destructive"
              onPress={handleDeleteAccount}
            />
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
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  logoutButton: {
    marginTop: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
