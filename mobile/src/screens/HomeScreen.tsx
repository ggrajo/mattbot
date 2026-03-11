import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StatusBar,
  ScrollView,
  Platform,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { GradientView } from '../components/ui/GradientView';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { FadeIn } from '../components/ui/FadeIn';
import { SkeletonLoader } from '../components/ui/SkeletonLoader';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useBillingStore } from '../store/billingStore';
import { useTelephonyStore } from '../store/telephonyStore';
import { useStatsStore } from '../store/statsStore';
import { hapticLight } from '../utils/haptics';
import { getDeviceTimezone } from '../utils/formatDate';
import { getTimezoneAbbr } from '../utils/timezones';

const SCREEN_W = Dimensions.get('window').width;
const H_PAD = 20;

function formatDurationCompact(seconds: number | null): string {
  if (seconds == null || seconds === 0) return '0:00';
  const rounded = Math.round(seconds);
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getGreeting(name: string | null): string {
  const hour = new Date().getHours();
  const timeLabel =
    hour >= 5 && hour < 12 ? 'Good morning' :
    hour >= 12 && hour < 17 ? 'Good afternoon' :
    'Good evening';
  return name ? `${timeLabel}, ${name}` : timeLabel;
}

function CircularProgress({
  percent,
  size = 72,
  strokeWidth = 5,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
}) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference * (1 - Math.min(percent, 1));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#FFFFFF"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFFFFF' }}>
        {Math.round(percent * 100)}%
      </Text>
      <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', marginTop: -1 }}>
        of plan
      </Text>
    </View>
  );
}

const QUICK_ACTIONS = [
  { icon: 'phone-settings-outline', label: 'Modes', route: 'CallModes', color: '#6366F1', hasIndicator: true },
  { icon: 'robot-outline', label: 'AI', route: 'AssistantSettings', color: '#8B5CF6' },
  { icon: 'calendar-outline', label: 'Schedule', route: 'Calendar', color: '#14B8A6' },
  { icon: 'bell-outline', label: 'Alerts', route: 'RemindersList', color: '#F472B6' },
  { icon: 'brain', label: 'Memory', route: 'MemoryList', color: '#0EA5E9' },
  { icon: 'account-group-outline', label: 'Contacts', route: 'ContactsList', color: '#F59E0B' },
] as const;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function QuickActionCard({
  action,
  onPress,
  colors,
  isDark,
}: {
  action: typeof QUICK_ACTIONS[number];
  onPress: () => void;
  colors: any;
  isDark: boolean;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => { scale.value = withSpring(0.93, { damping: 15, stiffness: 400 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 15, stiffness: 400 }); }}
      onPress={() => { hapticLight(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      style={[
        {
          width: 88,
          alignItems: 'center',
          marginRight: 12,
        },
        animatedStyle,
      ]}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          backgroundColor: isDark ? action.color + '18' : action.color + '12',
          alignItems: 'center',
          justifyContent: 'center',
          ...(isDark
            ? { borderWidth: 1, borderColor: action.color + '25' }
            : Platform.select({
                ios: { shadowColor: action.color, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 },
                android: { elevation: 2 },
              }) || {}),
        }}
      >
        {'hasIndicator' in action && action.hasIndicator && (
          <View
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: '#10B981',
              borderWidth: 2,
              borderColor: isDark ? '#0D0221' : colors.background,
            }}
          />
        )}
        <Icon name={action.icon} size={24} color={action.color} />
      </View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: colors.textSecondary,
          marginTop: 8,
        }}
        allowFontScaling
        numberOfLines={1}
      >
        {action.label}
      </Text>
    </AnimatedPressable>
  );
}

function KpiSkeleton({ colors, radii }: { colors: any; radii: any }) {
  const bg = colors.surfaceVariant;
  return (
    <View style={{ gap: 12 }}>
      <View style={{ backgroundColor: bg, borderRadius: radii.xl, height: 180 }} />
      <View style={{ backgroundColor: bg, borderRadius: radii.lg, height: 60 }} />
      <View style={{ backgroundColor: bg, borderRadius: radii.lg, height: 140 }} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, backgroundColor: bg, borderRadius: radii.lg, height: 120 }} />
        <View style={{ flex: 1, backgroundColor: bg, borderRadius: radii.lg, height: 120 }} />
      </View>
      <View style={{ backgroundColor: bg, borderRadius: radii.lg, height: 120, width: '48%' }} />
    </View>
  );
}

function EmptyDashboard({ colors, spacing, isDark }: { colors: any; spacing: any; isDark: boolean }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl }}>
      <View
        style={{
          width: 72, height: 72, borderRadius: 22,
          backgroundColor: '#6366F1' + (isDark ? '18' : '10'),
          alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
          ...(isDark ? { borderWidth: 1, borderColor: '#6366F125' } : {}),
        }}
      >
        <Icon name="phone-incoming" size={32} color="#6366F1" />
      </View>
      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm, textAlign: 'center' }} allowFontScaling>
        No calls yet
      </Text>
      <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, maxWidth: 280 }} allowFontScaling>
        Your dashboard will light up once your first call comes in. Set up your assistant below to get started.
      </Text>
    </View>
  );
}

export function HomeScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const nickname = useAuthStore(s => s.nickname);
  const displayName = useAuthStore(s => s.displayName);
  const { onboarding, loadOnboarding, completeStep, error: settingsError, settings: userSettings } = useSettingsStore();
  const userTz = userSettings?.timezone || getDeviceTimezone();
  const { billingStatus, loadBillingStatus, plans, loadPlans, error: billingError } = useBillingStore();
  const { numbers, loadNumbers, error: telephonyError } = useTelephonyStore();
  const { stats, loading: statsLoading, loadStats, error: statsError } = useStatsStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOnboarding().then(async () => {
      const state = useSettingsStore.getState().onboarding;
      if (state && !state.is_complete) {
        if (!state.steps_completed.includes('privacy_review')) {
          navigation.navigate('OnboardingPrivacy');
        } else if (!state.steps_completed.includes('profile_setup')) {
          navigation.navigate('OnboardingProfile');
        } else if (!state.steps_completed.includes('settings_configured')) {
          navigation.navigate('OnboardingSettings');
        } else if (!state.steps_completed.includes('assistant_setup')) {
          navigation.navigate('OnboardingAssistantSetup');
        } else if (!state.steps_completed.includes('calendar_setup')) {
          navigation.navigate('OnboardingCalendarSetup');
        } else if (
          !state.steps_completed.includes('plan_selected') ||
          !state.steps_completed.includes('payment_method_added')
        ) {
          navigation.navigate('PlanSelection', { source: 'onboarding' });
        } else if (!state.steps_completed.includes('number_provisioned')) {
          navigation.navigate('NumberProvision', { onboarding: true });
        } else if (!state.steps_completed.includes('call_modes_configured')) {
          navigation.navigate('CallModes', { onboarding: true });
        } else if (!state.steps_completed.includes('onboarding_complete')) {
          await completeStep('onboarding_complete');
          navigation.navigate('OnboardingComplete');
        }
      }
    });
    loadBillingStatus();
    loadPlans();
    loadNumbers();
    loadStats();
  }, []);

  useFocusEffect(
    useCallback(() => {
      useSettingsStore.setState({ error: null });
      useBillingStore.setState({ error: null });
      useTelephonyStore.setState({ error: null });
      useStatsStore.setState({ error: null });
      loadBillingStatus();
      loadPlans();
      loadNumbers();
      loadStats();
    }, [loadBillingStatus, loadPlans, loadNumbers, loadStats]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadBillingStatus(), loadPlans(), loadNumbers(), loadStats()]);
    setRefreshing(false);
  }, [loadBillingStatus, loadPlans, loadNumbers, loadStats]);

  const storeError = settingsError || billingError || telephonyError || statsError;

  const planName = billingStatus?.plan
    ? billingStatus.plan.charAt(0).toUpperCase() + billingStatus.plan.slice(1)
    : 'Free';
  const minutesUsed = billingStatus?.minutes_used ?? 0;
  const minutesIncluded = billingStatus?.minutes_included ?? 10;
  const minutesCarriedOver = billingStatus?.minutes_carried_over ?? 0;
  const totalMinutes = minutesIncluded + minutesCarriedOver;
  const minutesPercent = totalMinutes > 0 ? Math.min(1, minutesUsed / totalMinutes) : 0;
  const periodEndDate = billingStatus?.current_period_end
    ? new Date(billingStatus.current_period_end)
    : null;
  const daysUntilExpiry = periodEndDate
    ? Math.max(0, Math.ceil((periodEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const isApproachingLimit = minutesPercent >= 0.8;
  const isAtLimit = minutesPercent >= 1;

  const userName = displayName ? displayName.split(' ')[0] : (nickname || null);
  const isDark = theme.dark;
  const isStatsLoaded = stats != null;
  const hasNoCalls = isStatsLoaded && stats?.total_calls === 0;

  const bestUpgradePlan = (plans ?? [])
    .filter(p => !p.limited && parseFloat(p.price_usd) > 0 && p.code !== billingStatus?.plan)
    .sort((a, b) => parseFloat(b.price_usd) - parseFloat(a.price_usd))[0] ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={Platform.OS === 'android'} />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} progressBackgroundColor={colors.surface} />
        }
      >
        {/* Header */}
        <View
          style={{
            paddingTop: Platform.OS === 'android' ? insets.top + 16 : insets.top + 8,
            paddingHorizontal: H_PAD,
            paddingBottom: spacing.lg,
          }}
        >
          <FadeIn delay={0} slide="down">
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 }} allowFontScaling>
                  {getGreeting(userName)}
                </Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2 }} allowFontScaling>
                  Let's manage your calls ✨
                </Text>
              </View>
              <Pressable
                onPress={() => { hapticLight(); navigation.navigate('AccountTab'); }}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Settings"
              >
                <GradientView
                  colors={['#A855F7', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 42, height: 42, borderRadius: 21,
                    alignItems: 'center', justifyContent: 'center',
                    ...Platform.select({
                      ios: { shadowColor: '#EC4899', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12 },
                      android: { elevation: 6 },
                    }),
                  }}
                >
                  <Icon name="star-four-points-outline" size={22} color="#FFFFFF" />
                </GradientView>
              </Pressable>
            </View>
          </FadeIn>
        </View>

        {/* Main Content */}
        <View style={{ paddingHorizontal: H_PAD }}>
          {statsLoading && !isStatsLoaded ? (
            <KpiSkeleton colors={colors} radii={radii} />
          ) : hasNoCalls ? (
            <EmptyDashboard colors={colors} spacing={spacing} isDark={isDark} />
          ) : (
            <View style={{ gap: 12 }}>
              {/* Hero Card — Total Calls */}
              <FadeIn delay={0} scale>
                <GradientView
                  colors={['#7C3AED', '#A855F7', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: radii.xl,
                    padding: spacing.lg,
                    minHeight: 170,
                    ...Platform.select({
                      ios: { shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 20 },
                      android: { elevation: 8 },
                    }),
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="phone-incoming" size={20} color="#FFFFFF" />
                      </View>
                      <View>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Total Calls</Text>
                        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>This month</Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Icon name="trending-up" size={14} color="#4ADE80" />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#4ADE80' }}>+12%</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: spacing.lg }}>
                    <View>
                      <Text style={{ fontSize: 52, fontWeight: '800', color: '#FFFFFF', letterSpacing: -2, lineHeight: 56 }}>
                        {stats?.total_calls ?? 0}
                      </Text>
                      {(stats?.vip_calls ?? 0) > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                          <Icon name="star" size={14} color="#FBBF24" />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                            {stats?.vip_calls} VIP calls
                          </Text>
                        </View>
                      )}
                    </View>
                    <CircularProgress percent={minutesPercent} />
                  </View>
                </GradientView>
              </FadeIn>

              {/* Plan Strip */}
              <FadeIn delay={40}>
                <View
                  style={{
                    backgroundColor: isDark ? colors.surfaceVariant : '#FFFFFF',
                    borderRadius: radii.lg,
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.md,
                    ...(isDark
                      ? { borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }
                      : {
                          borderWidth: 1,
                          borderColor: 'rgba(124,58,237,0.08)',
                          ...Platform.select({
                            ios: { shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
                            android: { elevation: 2 },
                          }),
                        }),
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 16 }}>👑</Text>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>{planName}</Text>
                    </View>
                    <Pressable
                      onPress={() => { hapticLight(); navigation.navigate('PlanSelection', { source: 'manage' }); }}
                      style={{ backgroundColor: '#10B981', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Upgrade</Text>
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      {minutesUsed} of {totalMinutes} min used
                    </Text>
                    {daysUntilExpiry !== null && (
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                        {daysUntilExpiry}d left
                      </Text>
                    )}
                  </View>
                </View>
              </FadeIn>

              {/* Screened — Full Width */}
              <FadeIn delay={80} scale>
                <View
                  style={{
                    borderRadius: radii.xl,
                    padding: spacing.lg,
                    minHeight: 130,
                    backgroundColor: isDark ? '#2E1065' : '#DDD6FE',
                    overflow: 'hidden',
                    ...(isDark
                      ? { borderWidth: 1, borderColor: 'rgba(139,92,246,0.15)' }
                      : Platform.select({
                          ios: { shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 10 },
                          android: { elevation: 3 },
                        })),
                  }}
                >
                  <View style={{ position: 'absolute', right: 16, top: 16, opacity: 0.12 }}>
                    <Icon name="shield-check-outline" size={64} color={isDark ? '#A78BFA' : '#6366F1'} />
                  </View>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="check-circle-outline" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={{ fontSize: 40, fontWeight: '800', color: colors.textPrimary, marginTop: 12, letterSpacing: -1 }}>
                    {stats?.completed_calls ?? 0}
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textSecondary, marginTop: 2 }}>Screened</Text>
                </View>
              </FadeIn>

              {/* Callers + Spam — 2 columns */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <FadeIn delay={120} scale style={{ flex: 1 }}>
                  <View
                    style={{
                      borderRadius: radii.xl,
                      padding: spacing.lg,
                      minHeight: 120,
                      backgroundColor: isDark ? '#1E2A5E' : '#BFDBFE',
                      ...(isDark
                        ? { borderWidth: 1, borderColor: 'rgba(59,130,246,0.15)' }
                        : Platform.select({
                            ios: { shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 10 },
                            android: { elevation: 3 },
                          })),
                    }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#0EA5E9', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="account-group-outline" size={18} color="#FFFFFF" />
                    </View>
                    <Text style={{ fontSize: 32, fontWeight: '800', color: colors.textPrimary, marginTop: 10, letterSpacing: -0.5 }}>
                      {stats?.unique_callers ?? 0}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginTop: 2 }}>Callers</Text>
                  </View>
                </FadeIn>
                <FadeIn delay={150} scale style={{ flex: 1 }}>
                  <View
                    style={{
                      borderRadius: radii.xl,
                      padding: spacing.lg,
                      minHeight: 120,
                      backgroundColor: isDark ? '#4A1942' : '#FBCFE8',
                      ...(isDark
                        ? { borderWidth: 1, borderColor: 'rgba(236,72,153,0.15)' }
                        : Platform.select({
                            ios: { shadowColor: '#EC4899', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 10 },
                            android: { elevation: 3 },
                          })),
                    }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="shield-check-outline" size={18} color="#FFFFFF" />
                    </View>
                    <Text style={{ fontSize: 32, fontWeight: '800', color: colors.textPrimary, marginTop: 10, letterSpacing: -0.5 }}>
                      {stats?.spam_blocked ?? 0}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginTop: 2 }}>Spam</Text>
                  </View>
                </FadeIn>
              </View>

              {/* Avg Call + VIP Calls — 2 columns */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <FadeIn delay={180} scale style={{ flex: 1 }}>
                  <View
                    style={{
                      borderRadius: radii.xl,
                      padding: spacing.lg,
                      minHeight: 120,
                      backgroundColor: isDark ? '#422006' : '#FDE68A',
                      ...(isDark
                        ? { borderWidth: 1, borderColor: 'rgba(245,158,11,0.15)' }
                        : Platform.select({
                            ios: { shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 10 },
                            android: { elevation: 3 },
                          })),
                    }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="timer-outline" size={18} color="#FFFFFF" />
                    </View>
                    <Text style={{ fontSize: 32, fontWeight: '800', color: colors.textPrimary, marginTop: 10, letterSpacing: -0.5 }}>
                      {formatDurationCompact(stats?.avg_duration_seconds ?? null)}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginTop: 2 }}>Avg Call</Text>
                  </View>
                </FadeIn>
                <FadeIn delay={210} scale style={{ flex: 1 }}>
                  <View
                    style={{
                      borderRadius: radii.xl,
                      padding: spacing.lg,
                      minHeight: 120,
                      backgroundColor: isDark ? '#3B1320' : '#FFE4E6',
                      ...(isDark
                        ? { borderWidth: 1, borderColor: 'rgba(244,63,94,0.15)' }
                        : Platform.select({
                            ios: { shadowColor: '#F43F5E', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 10 },
                            android: { elevation: 3 },
                          })),
                    }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F43F5E', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="phone-missed" size={18} color="#FFFFFF" />
                    </View>
                    <Text style={{ fontSize: 32, fontWeight: '800', color: colors.textPrimary, marginTop: 10, letterSpacing: -0.5 }}>
                      {Math.max(0, (stats?.total_calls ?? 0) - (stats?.completed_calls ?? 0))}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textSecondary, marginTop: 2 }}>Missed</Text>
                  </View>
                </FadeIn>
              </View>
            </View>
          )}

          {/* Quick Actions */}
          <Text
            style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.2, marginTop: spacing.xl, marginBottom: spacing.md }}
            allowFontScaling
          >
            Quick Actions
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: H_PAD }}
          >
            {QUICK_ACTIONS.map((action) => (
              <QuickActionCard
                key={action.route}
                action={action}
                onPress={() => navigation.navigate(action.route)}
                colors={colors}
                isDark={isDark}
              />
            ))}
          </ScrollView>
        </View>

        {/* Usage Warnings */}
        {isApproachingLimit && (
          <View style={{ paddingHorizontal: H_PAD, paddingTop: spacing.lg }}>
            <FadeIn delay={0}>
              <Card
                variant="flat"
                style={{
                  backgroundColor: isAtLimit ? colors.errorContainer : colors.warningContainer,
                  borderColor: isAtLimit ? colors.error : colors.warning,
                  borderWidth: 1,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Icon
                    name={isAtLimit ? 'alert-circle-outline' : 'alert-outline'}
                    size="lg"
                    color={isAtLimit ? colors.error : colors.warning}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.body, color: isAtLimit ? colors.error : colors.warning, fontWeight: '600' }} allowFontScaling>
                      {isAtLimit ? 'Minutes limit reached' : 'Approaching minutes limit'}
                    </Text>
                    <Text style={{ ...typography.caption, color: isAtLimit ? colors.error : colors.warning }} allowFontScaling>
                      {isAtLimit
                        ? 'You have used all your included minutes for this period.'
                        : `You've used ${Math.round(minutesPercent * 100)}% of your included minutes.`}
                    </Text>
                  </View>
                </View>
              </Card>
            </FadeIn>
          </View>
        )}

        {/* Errors */}
        {storeError && (
          <View style={{ paddingHorizontal: H_PAD, paddingTop: spacing.sm }}>
            <ErrorMessage message={storeError} />
          </View>
        )}

        {/* Upgrade / Go Pro Card */}
        {bestUpgradePlan && (
          <View style={{ paddingHorizontal: H_PAD, paddingTop: spacing.xl, paddingBottom: spacing.xxl }}>
            <FadeIn delay={200} scale>
              <Pressable
                onPress={() => { hapticLight(); navigation.navigate('PlanSelection', { source: 'manage' }); }}
                style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
                accessibilityRole="button"
                accessibilityLabel={`Upgrade to ${bestUpgradePlan.name} plan`}
              >
                <GradientView
                  colors={['#7C3AED', '#A855F7', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: radii.xl,
                    padding: spacing.xl,
                    minHeight: 180,
                    overflow: 'hidden',
                    ...Platform.select({
                      ios: { shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 20 },
                      android: { elevation: 8 },
                    }),
                  }}
                >
                  <View style={{ position: 'absolute', right: 20, top: 20 }}>
                    <Text style={{ fontSize: 40 }}>👑</Text>
                  </View>

                  <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                    <Icon name="lightning-bolt" size={12} color="#FBBF24" />
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 }}>LIMITED OFFER</Text>
                  </View>

                  <Text style={{ fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginTop: spacing.md }}>
                    Go {bestUpgradePlan.name}
                  </Text>
                  <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4, lineHeight: 20 }}>
                    {bestUpgradePlan.description || `Unlimited calls + Premium features`}
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                      <Text style={{ fontSize: 36, fontWeight: '800', color: '#FFFFFF' }}>
                        ${parseFloat(bestUpgradePlan.price_usd).toFixed(0)}
                      </Text>
                      <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginLeft: 2 }}>/mo</Text>
                    </View>
                    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 10 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#7C3AED' }}>Upgrade</Text>
                    </View>
                  </View>
                </GradientView>
              </Pressable>
            </FadeIn>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
