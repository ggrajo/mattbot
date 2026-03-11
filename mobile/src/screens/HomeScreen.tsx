import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { Card } from '../components/ui/Card';
import { useTheme } from '../theme/ThemeProvider';

export function HomeScreen() {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;
  const navigation = useNavigation<any>();

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, padding: spacing.xl, gap: spacing.lg }}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={openDrawer} style={styles.hamburger}>
            <Text style={[styles.hamburgerIcon, { color: colors.textPrimary }]}>☰</Text>
          </TouchableOpacity>
          <Text style={[typography.h1, { color: colors.textPrimary, flex: 1 }]} allowFontScaling>
            MattBot
          </Text>
        </View>

        <Text style={[typography.body, { color: colors.textSecondary }]} allowFontScaling>
          Good to see you! Your AI call assistant is ready.
        </Text>

        <Card>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Subscription</Text>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
            Check the drawer menu to view or manage your plan.
          </Text>
        </Card>

        <Card>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Phone Number</Text>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
            Provision or manage your MattBot number from the drawer.
          </Text>
        </Card>

        <Card>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Recent Activity</Text>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
            No recent calls yet. Once your number is active, call activity will appear here.
          </Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hamburger: {
    padding: 4,
  },
  hamburgerIcon: {
    fontSize: 28,
    lineHeight: 32,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
  },
});
