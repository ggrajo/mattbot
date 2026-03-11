import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { HomeScreen } from '../screens/HomeScreen';
import { CallsListScreen } from '../screens/CallsListScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused, color }: { label: string; focused: boolean; color: string }) {
  const icons: Record<string, string> = {
    Home: '🏠',
    Calls: '📞',
    Settings: '⚙️',
  };
  return (
    <View style={tabIconStyles.wrap}>
      <Text style={[tabIconStyles.icon, focused && tabIconStyles.iconFocused]}>
        {icons[label] ?? '•'}
      </Text>
      {focused && <View style={[tabIconStyles.dot, { backgroundColor: color }]} />}
    </View>
  );
}

const tabIconStyles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 2 },
  icon: { fontSize: 20, opacity: 0.7 },
  iconFocused: { opacity: 1 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
});

export function TabNavigator() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 88 : 64,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -2,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused, color }) => <TabIcon label="Home" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="CallsTab"
        component={CallsListScreen}
        options={{
          title: 'Calls',
          tabBarLabel: 'Calls',
          tabBarIcon: ({ focused, color }) => <TabIcon label="Calls" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ focused, color }) => <TabIcon label="Settings" focused={focused} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
