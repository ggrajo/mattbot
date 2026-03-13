import React, { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { BiometricGate } from '../components/ui/BiometricGate';
import { BotLoader } from '../components/ui/BotLoader';
import { useAutoPermissions } from '../hooks/useAutoPermissions';
import { useNotificationHandler } from '../hooks/useNotificationHandler';
import { useRealtimeStore } from '../store/realtimeStore';
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
import { CallsListScreen } from '../screens/CallsListScreen';
import { CallDetailScreen } from '../screens/CallDetailScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { AddContactScreen } from '../screens/AddContactScreen';
import { CategoryDefaultsScreen } from '../screens/CategoryDefaultsScreen';
import { HandoffSettingsScreen } from '../screens/HandoffSettingsScreen';
import { PaymentMethodsListScreen } from '../screens/PaymentMethodsListScreen';
import { AssistantSettingsScreen } from '../screens/AssistantSettingsScreen';
import { ContactsListScreen } from '../screens/ContactsListScreen';
import { ContactDetailScreen } from '../screens/ContactDetailScreen';
import { BlockListScreen } from '../screens/BlockListScreen';
import { SpamListScreen } from '../screens/SpamListScreen';
import { VipListScreen } from '../screens/VipListScreen';
import { LiveTranscriptScreen } from '../screens/LiveTranscriptScreen';
import { CalendarBookingSettingsScreen } from '../screens/CalendarBookingSettingsScreen';
import { ProfileSettingsScreen } from '../screens/ProfileSettingsScreen';
import { MemoryListScreen } from '../screens/MemoryListScreen';
import { UrgentNotificationsScreen } from '../screens/UrgentNotificationsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { BusinessHoursScreen } from '../screens/BusinessHoursScreen';
import { KnowledgeBaseScreen } from '../screens/KnowledgeBaseScreen';
import { OnboardingCompleteScreen } from '../screens/OnboardingCompleteScreen';
import { RemindersListScreen } from '../screens/RemindersListScreen';
import { TextBackScreen } from '../screens/TextBackScreen';
import { CreateReminderScreen } from '../screens/CreateReminderScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function AuthenticatedHome({ biometricEnabled }: { biometricEnabled: boolean }) {
  useAutoPermissions();
  useNotificationHandler();

  useEffect(() => {
    useRealtimeStore.getState().connect();
    return () => useRealtimeStore.getState().disconnect();
  }, []);

  return (
    <BiometricGate
      enabled={biometricEnabled}
      promptMessage="Authenticate to access MattBot"
    >
      <TabNavigator />
    </BiometricGate>
  );
}

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['mattbot://'],
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
  const { settings, loadSettings } = useSettingsStore();
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    tryRestoreSession();
  }, []);

  useEffect(() => {
    if (state === 'authenticated' && !settingsLoaded) {
      loadSettings().then(() => setSettingsLoaded(true));
    }
  }, [state, settingsLoaded]);

  if (state === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <BotLoader color={theme.colors.primary} />
      </View>
    );
  }

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
    <NavigationContainer theme={navigationTheme} linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        {state === 'authenticated' ? (
          <>
            <Stack.Screen name="DrawerRoot">
              {() => <AuthenticatedHome biometricEnabled={biometricEnabled} />}
            </Stack.Screen>
            {/* Sub-screens accessible from within drawer screens */}
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ headerShown: true, title: 'Settings' }}
            />
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
              name="OnboardingSettings"
              component={OnboardingSettingsScreen}
              options={{ headerShown: true, title: 'Basic Settings', headerBackVisible: false }}
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
            {/* These duplicate drawer screens as stack screens so navigate() calls still work */}
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
              name="DeviceList"
              component={DeviceListScreen}
              options={{ headerShown: true, title: 'Devices' }}
            />
            <Stack.Screen
              name="AccountSettings"
              component={AccountSettingsScreen}
              options={{ headerShown: true, title: 'Account' }}
            />
            <Stack.Screen
              name="NumberProvision"
              component={NumberProvisionScreen}
              options={{ headerShown: true, title: 'Your AI Number', headerBackVisible: false }}
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
              name="CallsList"
              component={CallsListScreen}
              options={{ headerShown: true, title: 'Calls' }}
            />
            <Stack.Screen
              name="CallDetail"
              component={CallDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Calendar"
              component={CalendarScreen}
              options={{ headerShown: true, title: 'Calendar' }}
            />
            <Stack.Screen
              name="AddContact"
              component={AddContactScreen}
              options={{ headerShown: true, title: 'Add Contact' }}
            />
            <Stack.Screen
              name="CategoryDefaults"
              component={CategoryDefaultsScreen}
              options={{ headerShown: true, title: 'Category Defaults' }}
            />
            <Stack.Screen
              name="HandoffSettings"
              component={HandoffSettingsScreen}
              options={{ headerShown: true, title: 'Handoff Settings' }}
            />
            <Stack.Screen
              name="PaymentMethodsList"
              component={PaymentMethodsListScreen}
              options={{ headerShown: true, title: 'Payment Methods' }}
            />
            <Stack.Screen
              name="AssistantSettings"
              component={AssistantSettingsScreen}
              options={{ headerShown: true, title: 'AI Assistant' }}
            />
            <Stack.Screen
              name="ContactsList"
              component={ContactsListScreen}
              options={{ headerShown: true, title: 'Contacts' }}
            />
            <Stack.Screen
              name="ContactDetail"
              component={ContactDetailScreen}
              options={{ headerShown: true, title: 'Contact' }}
            />
            <Stack.Screen
              name="BlockList"
              component={BlockListScreen}
              options={{ headerShown: true, title: 'Blocked Numbers' }}
            />
            <Stack.Screen
              name="SpamList"
              component={SpamListScreen}
              options={{ headerShown: true, title: 'Spam Callers' }}
            />
            <Stack.Screen
              name="VipList"
              component={VipListScreen}
              options={{ headerShown: true, title: 'VIP List' }}
            />
            <Stack.Screen
              name="LiveTranscript"
              component={LiveTranscriptScreen}
              options={{ headerShown: true, title: 'Live Transcript' }}
            />
            <Stack.Screen
              name="CalendarBookingSettings"
              component={CalendarBookingSettingsScreen}
              options={{ headerShown: true, title: 'Calendar Booking' }}
            />
            <Stack.Screen
              name="ProfileSettings"
              component={ProfileSettingsScreen}
              options={{ headerShown: true, title: 'Profile Settings' }}
            />
            <Stack.Screen
              name="MemoryList"
              component={MemoryListScreen}
              options={{ headerShown: true, title: 'AI Memory' }}
            />
            <Stack.Screen
              name="UrgentNotifications"
              component={UrgentNotificationsScreen}
              options={{ headerShown: true, title: 'Urgent Notifications' }}
            />
            <Stack.Screen
              name="BusinessHours"
              component={BusinessHoursScreen}
              options={{ headerShown: true, title: 'Business Hours' }}
            />
            <Stack.Screen
              name="KnowledgeBase"
              component={KnowledgeBaseScreen}
              options={{ headerShown: true, title: 'Knowledge Base' }}
            />
            <Stack.Screen
              name="OnboardingComplete"
              component={OnboardingCompleteScreen}
              options={{ headerShown: false, gestureEnabled: false }}
            />
            <Stack.Screen
              name="RemindersList"
              component={RemindersListScreen}
              options={{ headerShown: true, title: 'Reminders' }}
            />
            <Stack.Screen
              name="TextBack"
              component={TextBackScreen}
              options={{ headerShown: true, title: 'Text Back' }}
            />
            <Stack.Screen
              name="CreateReminder"
              component={CreateReminderScreen}
              options={{ headerShown: true, title: 'Create Reminder' }}
            />
            <Stack.Screen
              name="OnboardingAssistantSetup"
              component={AssistantSettingsScreen}
              options={{ headerShown: true, title: 'AI Assistant Setup', headerBackVisible: false }}
            />
            <Stack.Screen
              name="OnboardingCalendarSetup"
              component={CalendarBookingSettingsScreen}
              options={{ headerShown: true, title: 'Calendar Setup', headerBackVisible: false }}
            />
          </>
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
    </NavigationContainer>
  );
}
