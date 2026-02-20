import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import { logout, logoutAll } from '../api/auth';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;
  const { signOut } = useAuthStore();

  async function handleLogout() {
    try {
      await logout();
    } catch {
      /* best-effort */
    }
    await signOut();
  }

  async function handleLogoutAll() {
    try {
      await logoutAll();
    } catch {
      /* best-effort */
    }
    await signOut();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, padding: spacing.xl, gap: spacing.lg }}>
        <Text style={{ ...typography.h1, color: colors.textPrimary }} allowFontScaling>
          MattBot
        </Text>
        <Text style={{ ...typography.body, color: colors.textSecondary }} allowFontScaling>
          You're signed in. Call features coming soon.
        </Text>

        <Card>
          <View style={{ gap: spacing.md }}>
            <Button
              title="Manage Devices"
              onPress={() => navigation.navigate('DeviceList')}
              variant="secondary"
            />
            <Button
              title="Sign Out"
              onPress={handleLogout}
              variant="outline"
            />
            <Button
              title="Sign Out All Devices"
              onPress={handleLogoutAll}
              variant="destructive"
            />
          </View>
        </Card>
      </View>
    </SafeAreaView>
  );
}
