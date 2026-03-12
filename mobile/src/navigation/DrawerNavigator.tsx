import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useTheme } from '../theme/ThemeProvider';
import { DrawerContent } from './DrawerContent';
import { DrawerParamList } from './types';

import { HomeScreen } from '../screens/HomeScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SubscriptionStatusScreen } from '../screens/SubscriptionStatusScreen';
import { CallModesScreen } from '../screens/CallModesScreen';
import { DeviceListScreen } from '../screens/DeviceListScreen';
import { AccountSettingsScreen } from '../screens/AccountSettingsScreen';

const Drawer = createDrawerNavigator<DrawerParamList>();

export function DrawerNavigator() {
  const theme = useTheme();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        drawerType: 'front',
        drawerStyle: {
          width: 280,
          backgroundColor: theme.colors.background,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: {
          ...theme.typography.h3,
          color: theme.colors.textPrimary,
        },
        sceneContainerStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Drawer.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: 'MattBot' }}
      />
      <Drawer.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Drawer.Screen
        name="SubscriptionTab"
        component={SubscriptionStatusScreen as any}
        options={{ title: 'Subscription' }}
      />
      <Drawer.Screen
        name="CallModesTab"
        component={CallModesScreen as any}
        options={{ title: 'Call Modes' }}
      />
      <Drawer.Screen
        name="DevicesTab"
        component={DeviceListScreen as any}
        options={{ title: 'Devices' }}
      />
      <Drawer.Screen
        name="AccountTab"
        component={AccountSettingsScreen}
        options={{ title: 'Account' }}
      />
    </Drawer.Navigator>
  );
}
