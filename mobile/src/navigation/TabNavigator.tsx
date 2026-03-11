import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/ui/Icon';
import { useTheme } from '../theme/ThemeProvider';
import { TabParamList } from './types';

import { HomeScreen } from '../screens/HomeScreen';
import { CallsListScreen } from '../screens/CallsListScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AccountSettingsScreen } from '../screens/AccountSettingsScreen';

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_CONFIG: {
  name: keyof TabParamList;
  label: string;
  iconOutline: string;
  iconFilled: string;
}[] = [
  { name: 'HomeTab', label: 'HOME', iconOutline: 'home-outline', iconFilled: 'home' },
  { name: 'CallsTab', label: 'CALLS', iconOutline: 'phone-outline', iconFilled: 'phone' },
  { name: 'SettingsTab', label: 'SETTINGS', iconOutline: 'cog-outline', iconFilled: 'cog' },
  { name: 'AccountTab', label: 'ACCOUNT', iconOutline: 'account-outline', iconFilled: 'account' },
];

export function TabNavigator() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
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
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ headerShown: false, title: 'MattBot' }}
      />
      <Tab.Screen
        name="CallsTab"
        component={CallsListScreen}
        options={{ title: 'Calls' }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountSettingsScreen}
        options={{ title: 'Account' }}
      />
    </Tab.Navigator>
  );
}

function CustomTabBar({ state, navigation }: any) {
  const theme = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.tabBar,
        borderTopWidth: 1,
        borderTopColor: colors.tabBarBorder,
        paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
        paddingTop: 8,
      }}
    >
      {TAB_CONFIG.map((tab, index) => {
        const isFocused = state.index === index;
        const iconName = isFocused ? tab.iconFilled : tab.iconOutline;
        const color = isFocused ? colors.primary : colors.textSecondary;

        return (
          <Pressable
            key={tab.name}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: state.routes[index].key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(state.routes[index].name);
              }
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={tab.label}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 4,
            }}
          >
            {isFocused && (
              <View
                style={{
                  width: 32,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.primary,
                  marginBottom: 4,
                }}
              />
            )}
            {!isFocused && <View style={{ height: 8 }} />}
            <Icon name={iconName} size={24} color={color} />
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color,
                marginTop: 4,
                letterSpacing: 0.5,
              }}
              allowFontScaling
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
