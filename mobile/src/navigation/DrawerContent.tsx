import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';

interface DrawerItemProps {
  label: string;
  onPress: () => void;
  icon?: string;
}

function DrawerItem({ label, onPress }: DrawerItemProps) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      style={[styles.item, { borderBottomColor: theme.colors.border }]}
      onPress={onPress}
    >
      <Text style={[styles.itemText, { color: theme.colors.textPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function DrawerContent(props: any) {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { signOut } = useAuthStore();

  const navigateTo = (screen: string) => {
    navigation.navigate(screen);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <DrawerContentScrollView {...props} style={{ backgroundColor: theme.colors.surface }}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>MattBot</Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>AI Call Assistant</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>BILLING</Text>
        <DrawerItem label="Subscription" onPress={() => navigateTo('SubscriptionStatus')} />
        <DrawerItem label="Select Plan" onPress={() => navigateTo('PlanSelection')} />
        <DrawerItem label="Manage Subscription" onPress={() => navigateTo('ManageSubscription')} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>TELEPHONY</Text>
        <DrawerItem label="Phone Number" onPress={() => navigateTo('NumberProvision')} />
        <DrawerItem label="Call Modes" onPress={() => navigateTo('CallModes')} />
        <DrawerItem label="Forwarding Setup" onPress={() => navigateTo('ForwardingSetupGuide')} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>SETTINGS</Text>
        <DrawerItem label="Settings" onPress={() => navigateTo('Settings')} />
        <DrawerItem label="Devices" onPress={() => navigateTo('DeviceList')} />
      </View>

      <View style={[styles.section, styles.bottomSection]}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={[styles.signOutText, { color: theme.colors.error }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingTop: 10 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSubtitle: { fontSize: 14, marginTop: 4 },
  section: { paddingHorizontal: 16, paddingVertical: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  item: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  itemText: { fontSize: 16, fontWeight: '500' },
  bottomSection: { marginTop: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e0e0e0' },
  signOutButton: { paddingVertical: 14 },
  signOutText: { fontSize: 16, fontWeight: '600' },
});
