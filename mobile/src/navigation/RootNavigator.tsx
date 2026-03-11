import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useBillingStore, useIsSubscriptionActive } from '../store/billingStore';
import { useDeviceStore } from '../store/deviceStore';
import { useRealtimeStore } from '../store/realtimeStore';
import { initializeFCM, setupFCMListeners } from '../services/fcmService';
import { BiometricGate } from '../components/ui/BiometricGate';
import { RootStackParamList } from './types';
import { TabNavigator } from './TabNavigator';

import { WelcomeScreen } from '../screens/WelcomeScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { PasswordResetConfirmScreen } from '../screens/PasswordResetConfirmScreen';
import { EmailVerificationScreen } from '../screens/EmailVerificationScreen';
import { MfaEnrollScreen } from '../screens/MfaEnrollScreen';
import { RecoveryCodesScreen } from '../screens/RecoveryCodesScreen';
import { MfaVerifyScreen } from '../screens/MfaVerifyScreen';
import { OnboardingPrivacyScreen } from '../screens/OnboardingPrivacyScreen';
import { OnboardingProfileScreen } from '../screens/OnboardingProfileScreen';
import { OnboardingSettingsScreen } from '../screens/OnboardingSettingsScreen';
import { PrivacySettingsScreen } from '../screens/PrivacySettingsScreen';
import { QuietHoursScreen } from '../screens/QuietHoursScreen';
import { MemorySettingsScreen } from '../screens/MemorySettingsScreen';
import { PlanSelectionScreen } from '../screens/PlanSelectionScreen';
import { PaymentMethodScreen } from '../screens/PaymentMethodScreen';
import { ManageSubscriptionScreen } from '../screens/ManageSubscriptionScreen';
import { SubscriptionStatusScreen } from '../screens/SubscriptionStatusScreen';
import { NumberProvisionScreen } from '../screens/NumberProvisionScreen';
import { CallModesScreen } from '../screens/CallModesScreen';
import { DeviceListScreen } from '../screens/DeviceListScreen';
import { AccountSettingsScreen } from '../screens/AccountSettingsScreen';
import { ForwardingSetupGuideScreen } from '../screens/ForwardingSetupGuideScreen';
import { ForwardingVerifyScreen } from '../screens/ForwardingVerifyScreen';
import { ProfileSettingsScreen } from '../screens/ProfileSettingsScreen';
import { OnboardingAssistantSetupScreen } from '../screens/OnboardingAssistantSetupScreen';
import { AssistantSettingsScreen } from '../screens/AssistantSettingsScreen';
import { CallDetailScreen } from '../screens/CallDetailScreen';
import { CallerProfileScreen } from '../screens/CallerProfileScreen';
import { SubscriptionGateScreen } from '../screens/SubscriptionGateScreen';
import { BusinessHoursScreen } from '../screens/BusinessHoursScreen';
import { TemperamentScreen } from '../screens/TemperamentScreen';
import { HandoffSettingsScreen } from '../screens/HandoffSettingsScreen';
import { VipListScreen } from '../screens/VipListScreen';
import { BlockListScreen } from '../screens/BlockListScreen';
import { RemindersListScreen } from '../screens/RemindersListScreen';
import { MemoryListScreen } from '../screens/MemoryListScreen';
import { CreateReminderScreen } from '../screens/CreateReminderScreen';
import { TextBackScreen } from '../screens/TextBackScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { CalendarBookingSettingsScreen } from '../screens/CalendarBookingSettingsScreen';
import { UrgentNotificationsScreen } from '../screens/UrgentNotificationsScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { PinSetupScreen } from '../screens/PinSetupScreen';
import { PinLoginScreen } from '../screens/PinLoginScreen';
import { OnboardingCalendarSetupScreen } from '../screens/OnboardingCalendarSetupScreen';
import { OnboardingCompleteScreen } from '../screens/OnboardingCompleteScreen';
import { LiveTranscriptScreen } from '../screens/LiveTranscriptScreen';
import { PaymentMethodsListScreen } from '../screens/PaymentMethodsListScreen';
import { ContactsListScreen } from '../screens/ContactsListScreen';
import { ContactDetailScreen } from '../screens/ContactDetailScreen';
import { AddContactScreen } from '../screens/AddContactScreen';
import { CategoryDefaultsScreen } from '../screens/CategoryDefaultsScreen';
import { SettingsHubScreen } from '../screens/SettingsHubScreen';
import { HandoffBanner } from '../components/HandoffBanner';

let _deepLinkScheme: string | undefined;
try {
  const Config = require('react-native-config').default;
  _deepLinkScheme = Config?.DEEP_LINK_SCHEME;
} catch { /* not available */ }
const DEEP_LINK_PREFIX = `${_deepLinkScheme || 'mattbot'}://`;

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [DEEP_LINK_PREFIX],
  config: {
    screens: {
      EmailVerification: {
        path: 'verify-email',
        parse: { token: (token: string) => token },
      },
      PasswordResetConfirm: {
        path: 'reset-password',
        parse: { token: (token: string) => token },
      },
      Calendar: 'calendar-connected',
      CallDetail: {
        path: 'call-detail/:callId',
        parse: { callId: (callId: string) => callId },
      },
    },
  },
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    return url ?? undefined;
  },
};

export function RootNavigator() {
  const theme = useTheme();
  const { state, tryRestoreSession } = useAuthStore();
  const settings = useSettingsStore(s => s.settings);
  const loadSettings = useSettingsStore(s => s.loadSettings);
  const loadOnboarding = useSettingsStore(s => s.loadOnboarding);
  const onboarding = useSettingsStore(s => s.onboarding);
  const loadBillingStatus = useBillingStore(s => s.loadBillingStatus);
  const isSubscriptionActive = useIsSubscriptionActive();
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    tryRestoreSession();
  }, []);

  const fcmCleanup = useRef<(() => void) | null>(null);
  const fcmInitialized = useRef(false);
  const fetchDevices = useDeviceStore(s => s.fetchDevices);
  const currentDevice = useDeviceStore(s => s.device);

  useEffect(() => {
    if (state === 'authenticated' && !settingsLoaded) {
      loadSettings().then(() => setSettingsLoaded(true));
      loadOnboarding();
      loadBillingStatus();
      useAuthStore.getState().loadProfile();
      fetchDevices();
      useRealtimeStore.getState().connect();
    }
    if (state !== 'authenticated') {
      setSettingsLoaded(false);
      useSettingsStore.getState().reset();
      useBillingStore.getState().reset();
      useRealtimeStore.getState().disconnect();
      fcmInitialized.current = false;
      if (fcmCleanup.current) {
        fcmCleanup.current();
        fcmCleanup.current = null;
      }
    }
  }, [state, settingsLoaded]);

  useEffect(() => {
    if (state !== 'authenticated' || !currentDevice?.id || fcmInitialized.current) return;
    fcmInitialized.current = true;

    (async () => {
      try {
        await initializeFCM(currentDevice.id);
        const unsub = setupFCMListeners();
        if (unsub) fcmCleanup.current = unsub;
      } catch (e) {
        console.warn('FCM init failed (non-fatal):', e);
      }
    })();
  }, [state, currentDevice?.id]);

  const onboardingComplete = onboarding?.is_complete ?? false;
  const showGate = onboardingComplete && isSubscriptionActive === false;

  const navigationTheme = {
    dark: theme.dark,
    colors: {
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.textPrimary,
      border: theme.colors.border,
      notification: theme.colors.error,
    },
  };

  const biometricEnabled = settings?.biometric_unlock_enabled ?? false;

  return (
    <View style={{ flex: 1 }}>
    <NavigationContainer theme={navigationTheme} linking={linking}>
      {state === 'loading' ? (
        <View
          style={{
            flex: 1,
            backgroundColor: theme.colors.background,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        {state === 'pin_login' ? (
          <>
            <Stack.Screen
              name="PinLogin"
              component={PinLoginScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : state === 'authenticated' ? (
          showGate ? (
            <>
              {/* Subscription inactive -- only show gate + billing/account screens */}
              <Stack.Screen
                name="SubscriptionGate"
                component={SubscriptionGateScreen}
              />
              <Stack.Screen
                name="PlanSelection"
                component={PlanSelectionScreen}
                options={{ headerShown: true, title: 'Select Plan' }}
              />
              <Stack.Screen
                name="PaymentMethod"
                component={PaymentMethodScreen}
                options={{ headerShown: true, title: 'Payment' }}
              />
              <Stack.Screen
                name="ManageSubscription"
                component={ManageSubscriptionScreen}
                options={{ headerShown: true, title: 'Change Plan' }}
              />
              <Stack.Screen
                name="AccountSettings"
                component={AccountSettingsScreen}
                options={{ headerShown: true, title: 'Account' }}
              />
              <Stack.Screen
                name="SettingsHub"
                component={SettingsHubScreen}
                options={{ headerShown: true, title: 'Settings' }}
              />
            </>
          ) : (
            <>
              <Stack.Screen name="TabRoot">
                {() => (
                  <BiometricGate
                    enabled={biometricEnabled}
                    promptMessage="Authenticate to access MattBot"
                  >
                    <TabNavigator />
                  </BiometricGate>
                )}
              </Stack.Screen>
              {/* Sub-screens accessible from within tab screens */}
              <Stack.Screen
                name="PrivacySettings"
                component={PrivacySettingsScreen}
                options={{ headerShown: true, title: 'Privacy & Security' }}
              />
              <Stack.Screen
                name="QuietHours"
                component={QuietHoursScreen}
                options={{ headerShown: true, title: 'Quiet Hours' }}
              />
              <Stack.Screen
                name="MemorySettings"
                component={MemorySettingsScreen}
                options={{ headerShown: true, title: 'Memory' }}
              />
              <Stack.Screen
                name="OnboardingPrivacy"
                component={OnboardingPrivacyScreen}
                options={{ headerShown: true, title: 'Privacy Review', headerBackVisible: false }}
              />
              <Stack.Screen
                name="OnboardingProfile"
                component={OnboardingProfileScreen}
                options={{ headerShown: true, title: 'Your Profile', headerBackVisible: false }}
              />
              <Stack.Screen
                name="OnboardingSettings"
                component={OnboardingSettingsScreen}
                options={{ headerShown: true, title: 'Basic Settings', headerBackVisible: false }}
              />
              <Stack.Screen
                name="OnboardingAssistantSetup"
                component={OnboardingAssistantSetupScreen}
                options={{ headerShown: true, title: 'Assistant Setup', headerBackVisible: false }}
              />
              <Stack.Screen
                name="PlanSelection"
                component={PlanSelectionScreen}
                options={{ headerShown: true, title: 'Select Plan' }}
              />
              <Stack.Screen
                name="PaymentMethod"
                component={PaymentMethodScreen}
                options={{ headerShown: true, title: 'Payment' }}
              />
              <Stack.Screen
                name="ManageSubscription"
                component={ManageSubscriptionScreen}
                options={{ headerShown: true, title: 'Change Plan' }}
              />
              <Stack.Screen
                name="SubscriptionStatus"
                component={SubscriptionStatusScreen}
                options={{ headerShown: true, title: 'Subscription' }}
              />
              <Stack.Screen
                name="CallModes"
                component={CallModesScreen}
                options={{ headerShown: true, title: 'Call Modes' }}
              />
              <Stack.Screen
                name="OnboardingComplete"
                component={OnboardingCompleteScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="DeviceList"
                component={DeviceListScreen}
                options={{ headerShown: true, title: 'Devices' }}
              />
              <Stack.Screen
                name="NumberProvision"
                component={NumberProvisionScreen}
                options={({ route }) => ({
                  headerShown: true,
                  title: 'Your AI Number',
                  headerBackVisible: !(route.params as { onboarding?: boolean } | undefined)?.onboarding,
                })}
              />
              <Stack.Screen
                name="ProfileSettings"
                component={ProfileSettingsScreen}
                options={{ headerShown: true, title: 'Profile' }}
              />
              <Stack.Screen
                name="ChangePassword"
                component={ChangePasswordScreen}
                options={{ headerShown: true, title: 'Password' }}
              />
              <Stack.Screen
                name="PinSetup"
                component={PinSetupScreen}
                options={{ headerShown: true, title: 'PIN Login' }}
              />
              <Stack.Screen
                name="AssistantSettings"
                component={AssistantSettingsScreen}
                options={{ headerShown: true, title: 'Assistant' }}
              />
              <Stack.Screen
                name="ForwardingSetupGuide"
                component={ForwardingSetupGuideScreen}
                options={{ headerShown: true, title: 'Forwarding Setup' }}
              />
              <Stack.Screen
                name="ForwardingVerify"
                component={ForwardingVerifyScreen}
                options={{ headerShown: true, title: 'Verify Forwarding' }}
              />
              <Stack.Screen
                name="CallDetail"
                component={CallDetailScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CallerProfile"
                component={CallerProfileScreen}
                options={{ headerShown: true, title: 'Caller Profile' }}
              />
              <Stack.Screen
                name="LiveTranscript"
                component={LiveTranscriptScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CreateReminder"
                component={CreateReminderScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="TextBack"
                component={TextBackScreen}
                options={{ headerShown: true, title: 'Text Back' }}
              />
              <Stack.Screen
                name="BusinessHours"
                component={BusinessHoursScreen}
                options={{ headerShown: true, title: 'Business Hours' }}
              />
              <Stack.Screen
                name="Temperament"
                component={TemperamentScreen}
                options={{ headerShown: true, title: 'Temperament' }}
              />
              <Stack.Screen
                name="HandoffSettings"
                component={HandoffSettingsScreen}
                options={{ headerShown: true, title: 'Handoff' }}
              />
              <Stack.Screen
                name="AccountSettings"
                component={AccountSettingsScreen}
                options={{ headerShown: true, title: 'Account' }}
              />
              <Stack.Screen
                name="SettingsHub"
                component={SettingsHubScreen}
                options={{ headerShown: true, title: 'Settings' }}
              />
              <Stack.Screen
                name="VipList"
                component={VipListScreen}
                options={{ headerShown: true, title: 'VIP List' }}
              />
              <Stack.Screen
                name="BlockList"
                component={BlockListScreen}
                options={{ headerShown: true, title: 'Block List' }}
              />
              <Stack.Screen
                name="RemindersList"
                component={RemindersListScreen}
                options={{ headerShown: true, title: 'Reminders' }}
              />
              <Stack.Screen
                name="MemoryList"
                component={MemoryListScreen}
                options={{ headerShown: true, title: 'Memory Items' }}
              />
              <Stack.Screen
                name="Calendar"
                component={CalendarScreen}
                options={{ headerShown: true, title: 'Calendar' }}
              />
              <Stack.Screen
                name="CalendarBookingSettings"
                component={CalendarBookingSettingsScreen}
                options={{ headerShown: true, title: 'Calendar & Booking' }}
              />
              <Stack.Screen
                name="UrgentNotifications"
                component={UrgentNotificationsScreen}
                options={{ headerShown: true, title: 'Urgent Call Alerts' }}
              />
              <Stack.Screen
                name="PaymentMethodsList"
                component={PaymentMethodsListScreen}
                options={{ headerShown: true, title: 'Payment Methods' }}
              />
              <Stack.Screen
                name="ContactsList"
                component={ContactsListScreen}
                options={{ headerShown: true, title: 'Contacts' }}
              />
              <Stack.Screen
                name="ContactDetail"
                component={ContactDetailScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="AddContact"
                component={AddContactScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="CategoryDefaults"
                component={CategoryDefaultsScreen}
                options={{ headerShown: true, title: 'Category Defaults' }}
              />
              <Stack.Screen
                name="OnboardingCalendarSetup"
                component={OnboardingCalendarSetupScreen}
                options={{ headerShown: false }}
              />
            </>
          )
        ) : (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ headerShown: true, title: 'Create Account' }}
            />
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: true, title: 'Sign In' }}
            />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{ headerShown: true, title: 'Reset Password' }}
            />
            <Stack.Screen
              name="PasswordResetConfirm"
              component={PasswordResetConfirmScreen}
              options={{ headerShown: true, title: 'New Password' }}
            />
            <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
            <Stack.Screen
              name="MfaEnroll"
              component={MfaEnrollScreen}
              options={{ headerShown: true, title: 'Set Up 2FA', headerBackVisible: false }}
            />
            <Stack.Screen
              name="RecoveryCodes"
              component={RecoveryCodesScreen}
              options={{ headerShown: true, title: 'Recovery Codes', headerBackVisible: false }}
            />
            <Stack.Screen
              name="MfaVerify"
              component={MfaVerifyScreen}
              options={{ headerShown: true, title: 'Verify 2FA' }}
            />
          </>
        )}
      </Stack.Navigator>
    )}
    </NavigationContainer>
    {/* HandoffBanner hidden until feature is fully wired up */}
    </View>
  );
}
