import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useTheme } from '../theme/ThemeProvider';
import { HomeScreen } from '../screens/HomeScreen';
import { DrawerContent } from './DrawerContent';

const Drawer = createDrawerNavigator();

export function DrawerNavigator() {
  const theme = useTheme();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: theme.colors.surface,
          width: 280,
        },
        drawerActiveBackgroundColor: theme.colors.primaryContainer,
        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: theme.colors.textSecondary,
      }}
    >
      <Drawer.Screen name="HomeDrawer" component={HomeScreen} options={{ title: 'Home' }} />
    </Drawer.Navigator>
  );
}
