import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { DrawerContent } from './DrawerContent';
import { HomeScreen } from '../screens/HomeScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SubscriptionStatusScreen } from '../screens/SubscriptionStatusScreen';
import { CallModesScreen } from '../screens/CallModesScreen';
import { DeviceListScreen } from '../screens/DeviceListScreen';
import { AccountSettingsScreen } from '../screens/AccountSettingsScreen';
import { useTheme } from '../theme/ThemeProvider';

const Drawer = createDrawerNavigator();

export function DrawerNavigator() {
  const { colors } = useTheme();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: {
          width: 280,
          backgroundColor: colors.background,
        },
        swipeEdgeWidth: 50,
      }}
    >
      <Drawer.Screen name="HomeTab" component={HomeScreen} />
      <Drawer.Screen name="SubscriptionTab" component={SubscriptionStatusScreen} />
      <Drawer.Screen name="CallModesTab" component={CallModesScreen} />
      <Drawer.Screen name="DevicesTab" component={DeviceListScreen} />
      <Drawer.Screen name="SettingsTab" component={SettingsScreen} />
      <Drawer.Screen name="AccountTab" component={AccountSettingsScreen} />
    </Drawer.Navigator>
  );
}
