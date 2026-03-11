import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { HomeScreen } from '../screens/HomeScreen';
import { CallsListScreen } from '../screens/CallsListScreen';
import { SettingsHubScreen } from '../screens/SettingsHubScreen';

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
  wrap: { alignItems: 'center', gap: 3 },
  icon: { fontSize: 22, opacity: 0.6 },
  iconFocused: { opacity: 1, transform: [{ scale: 1.1 }] },
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
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 90 : 66,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 0,
          letterSpacing: 0.2,
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
        component={SettingsHubScreen}
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ focused, color }) => <TabIcon label="Settings" focused={focused} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
