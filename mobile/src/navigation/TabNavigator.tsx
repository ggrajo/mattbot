import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
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
  { name: 'HomeTab', label: 'Home', iconOutline: 'home-outline', iconFilled: 'home' },
  { name: 'CallsTab', label: 'Calls', iconOutline: 'phone-outline', iconFilled: 'phone' },
  { name: 'SettingsTab', label: 'Settings', iconOutline: 'cog-outline', iconFilled: 'cog' },
  { name: 'AccountTab', label: 'Profile', iconOutline: 'account-outline', iconFilled: 'account' },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
          borderBottomWidth: 0,
        },
        headerTintColor: theme.colors.textPrimary,
        headerTitleStyle: {
          ...theme.typography.h3,
          color: theme.colors.textPrimary,
        },
        lazy: true,
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

function TabBarItem({
  tab,
  isFocused,
  onPress,
}: {
  tab: typeof TAB_CONFIG[number];
  isFocused: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { colors } = theme;
  const scale = useSharedValue(1);

  const iconName = isFocused ? tab.iconFilled : tab.iconOutline;
  const color = isFocused ? colors.primary : colors.textSecondary;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={tab.label}
      style={[
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 6,
        },
        animatedStyle,
      ]}
    >
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 16,
          paddingVertical: 6,
          borderRadius: 16,
          backgroundColor: isFocused ? colors.primary + '14' : 'transparent',
        }}
      >
        <Icon name={iconName} size={22} color={color} />
      </View>
      <Text
        style={{
          fontSize: 10,
          fontWeight: isFocused ? '700' : '500',
          color,
          marginTop: 2,
          letterSpacing: 0.3,
        }}
        allowFontScaling
      >
        {tab.label}
      </Text>
    </AnimatedPressable>
  );
}

function CustomTabBar({ state, navigation }: any) {
  const theme = useTheme();
  const { colors, radii } = theme;
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: Platform.OS === 'ios' ? insets.bottom : 12,
        borderRadius: radii.xxl,
        backgroundColor: colors.tabBar,
        flexDirection: 'row',
        paddingTop: 6,
        paddingBottom: 6,
        ...(theme.dark
          ? {
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.06)',
            }
          : {}),
        ...Platform.select({
          ios: {
            shadowColor: theme.dark ? '#000' : colors.primary,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: theme.dark ? 0.4 : 0.12,
            shadowRadius: 24,
          },
          android: {
            elevation: 12,
          },
        }),
      }}
    >
      {TAB_CONFIG.map((tab, index) => {
        const isFocused = state.index === index;

        return (
          <TabBarItem
            key={tab.name}
            tab={tab}
            isFocused={isFocused}
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
          />
        );
      })}
    </View>
  );
}
