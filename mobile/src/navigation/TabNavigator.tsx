import React, { useCallback } from 'react';
import { View, Pressable, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { hapticLight } from '../utils/haptics';
import { HomeScreen } from '../screens/HomeScreen';
import { CallsListScreen } from '../screens/CallsListScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { AccountHubScreen } from '../screens/AccountHubScreen';
import { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const TABS: {
  name: keyof TabParamList;
  label: string;
  iconActive: string;
  iconInactive: string;
}[] = [
  { name: 'HomeTab', label: 'Home', iconActive: 'home', iconInactive: 'home-outline' },
  { name: 'CallsTab', label: 'Calls', iconActive: 'phone', iconInactive: 'phone-outline' },
  { name: 'CalendarTab', label: 'Calendar', iconActive: 'calendar', iconInactive: 'calendar-outline' },
  { name: 'AccountTab', label: 'Account', iconActive: 'account', iconInactive: 'account-outline' },
];

function TabBarButton({
  tab,
  focused,
  onPress,
}: {
  tab: (typeof TABS)[number];
  focused: boolean;
  onPress: () => void;
}) {
  const { colors, spacing, typography, radii } = useTheme();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.88, { damping: 15, stiffness: 400 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, []);

  const handlePress = useCallback(() => {
    hapticLight();
    onPress();
  }, [onPress]);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabButton}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.label}
    >
      <Animated.View
        style={[
          styles.tabContent,
          {
            backgroundColor: focused
              ? colors.primary + '1A'
              : 'transparent',
            borderRadius: radii.lg,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs + 2,
          },
          animStyle,
        ]}
      >
        <Icon
          name={focused ? tab.iconActive : tab.iconInactive}
          size={22}
          color={focused ? colors.primary : colors.textSecondary}
        />
        <Text
          style={{
            ...typography.caption,
            fontWeight: focused ? '600' : '400',
            color: focused ? colors.primary : colors.textSecondary,
            marginTop: 1,
          }}
          numberOfLines={1}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function FloatingTabBar({ state, navigation }: any) {
  const theme = useTheme();
  const { colors, radii, shadows } = theme;
  const insets = useSafeAreaInsets();

  const barStyle = theme.dark
    ? {
        backgroundColor: 'rgba(15,8,32,0.85)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
      }
    : {
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderWidth: 1,
        borderColor: 'rgba(124,58,237,0.06)',
        ...Platform.select({
          ios: { shadowColor: '#7C3AED', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 20 },
          android: { elevation: 8 },
        }),
      };

  return (
    <View
      style={[
        styles.floatingBar,
        {
          bottom: Math.max(insets.bottom, 8) + 4,
          borderRadius: radii.xxl,
          ...barStyle,
        },
      ]}
    >
      {TABS.map((tab, idx) => (
        <TabBarButton
          key={tab.name}
          tab={tab}
          focused={state.index === idx}
          onPress={() => {
            const event = navigation.emit({
              type: 'tabPress',
              target: state.routes[idx].key,
              canPreventDefault: true,
            });
            if (!event.defaultPrevented && state.index !== idx) {
              navigation.navigate(state.routes[idx].name);
            }
          }}
        />
      ))}
    </View>
  );
}

export function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="CallsTab" component={CallsListScreen} />
      <Tab.Screen name="CalendarTab" component={CalendarScreen} />
      <Tab.Screen name="AccountTab" component={AccountHubScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  floatingBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
