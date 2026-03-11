import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { HomeScreen } from '../screens/HomeScreen';
import { CallsListScreen } from '../screens/CallsListScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { AccountHubScreen } from '../screens/AccountHubScreen';
import { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

export function TabNavigator() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.tabBarBorder,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Icon name="home-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="CallsTab"
        component={CallsListScreen}
        options={{
          title: 'Calls',
          tabBarIcon: ({ color, size }) => <Icon name="phone-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalendarScreen}
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => <Icon name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountHubScreen}
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <Icon name="account-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
