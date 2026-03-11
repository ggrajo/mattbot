import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from './types';

import { WelcomeScreen } from '../screens/WelcomeScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { EmailVerificationScreen } from '../screens/EmailVerificationScreen';
import { MfaEnrollScreen } from '../screens/MfaEnrollScreen';
import { RecoveryCodesScreen } from '../screens/RecoveryCodesScreen';
import { MfaVerifyScreen } from '../screens/MfaVerifyScreen';
import { TabNavigator } from './TabNavigator';
import { DeviceListScreen } from '../screens/DeviceListScreen';
import { PlanSelectionScreen } from '../screens/PlanSelectionScreen';
import { PaymentMethodScreen } from '../screens/PaymentMethodScreen';
import { SubscriptionStatusScreen } from '../screens/SubscriptionStatusScreen';
import { ManageSubscriptionScreen } from '../screens/ManageSubscriptionScreen';
import { NumberProvisionScreen } from '../screens/NumberProvisionScreen';
import { CallModesScreen } from '../screens/CallModesScreen';
import { ForwardingSetupGuideScreen } from '../screens/ForwardingSetupGuideScreen';
import { ForwardingVerifyScreen } from '../screens/ForwardingVerifyScreen';
import { CallDetailScreen } from '../screens/CallDetailScreen';
import { OnboardingAssistantSetupScreen } from '../screens/OnboardingAssistantSetupScreen';
import { AssistantSettingsScreen } from '../screens/AssistantSettingsScreen';
import { SubscriptionGateScreen } from '../screens/SubscriptionGateScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { CalendarBookingSettingsScreen } from '../screens/CalendarBookingSettingsScreen';
import { OnboardingCalendarSetupScreen } from '../screens/OnboardingCalendarSetupScreen';
import { CallerProfileScreen } from '../screens/CallerProfileScreen';
import { MemoryListScreen } from '../screens/MemoryListScreen';
import { TemperamentScreen } from '../screens/TemperamentScreen';
import { BusinessHoursScreen } from '../screens/BusinessHoursScreen';
import { AccountSettingsScreen } from '../screens/AccountSettingsScreen';
import { AccountHubScreen } from '../screens/AccountHubScreen';
import { ContactsListScreen } from '../screens/ContactsListScreen';
import { ContactDetailScreen } from '../screens/ContactDetailScreen';
import { AddContactScreen } from '../screens/AddContactScreen';
import { CategoryDefaultsScreen } from '../screens/CategoryDefaultsScreen';
import { PinSetupScreen } from '../screens/PinSetupScreen';
import { PinLoginScreen } from '../screens/PinLoginScreen';
import { PaymentMethodsListScreen } from '../screens/PaymentMethodsListScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const theme = useTheme();
  const { state, tryRestoreSession } = useAuthStore();

  useEffect(() => {
    tryRestoreSession();
  }, []);

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
        <ActivityIndicator size="large" color={theme.colors.primary} />
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

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        {state === 'authenticated' ? (
          <>
            <Stack.Screen name="Home" component={TabNavigator} />
            <Stack.Screen
              name="DeviceList"
              component={DeviceListScreen}
              options={{ headerShown: true, title: 'Devices' }}
            />
            <Stack.Screen
              name="PlanSelection"
              component={PlanSelectionScreen}
              options={{ headerShown: true, title: 'Choose Plan' }}
            />
            <Stack.Screen
              name="PaymentMethod"
              component={PaymentMethodScreen}
              options={{ headerShown: true, title: 'Payment Method' }}
            />
            <Stack.Screen
              name="SubscriptionStatus"
              component={SubscriptionStatusScreen}
              options={{ headerShown: true, title: 'Subscription' }}
            />
            <Stack.Screen
              name="ManageSubscription"
              component={ManageSubscriptionScreen}
              options={{ headerShown: true, title: 'Manage Subscription' }}
            />
            <Stack.Screen
              name="NumberProvision"
              component={NumberProvisionScreen}
              options={{ headerShown: true, title: 'Phone Number' }}
            />
            <Stack.Screen
              name="CallModes"
              component={CallModesScreen}
              options={{ headerShown: true, title: 'Call Modes' }}
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
              options={{ headerShown: true, title: 'Call Detail' }}
            />
            <Stack.Screen
              name="OnboardingAssistantSetup"
              component={OnboardingAssistantSetupScreen}
              options={{ headerShown: true, title: 'Assistant Setup' }}
            />
            <Stack.Screen
              name="AssistantSettings"
              component={AssistantSettingsScreen}
              options={{ headerShown: true, title: 'Assistant Settings' }}
            />
            <Stack.Screen
              name="SubscriptionGate"
              component={SubscriptionGateScreen}
              options={{ headerShown: true, title: 'Subscription Required' }}
            />
            <Stack.Screen
              name="Calendar"
              component={CalendarScreen}
              options={{ headerShown: true, title: 'Calendar' }}
            />
            <Stack.Screen
              name="CalendarBookingSettings"
              component={CalendarBookingSettingsScreen}
              options={{ headerShown: true, title: 'Calendar Settings' }}
            />
            <Stack.Screen
              name="OnboardingCalendarSetup"
              component={OnboardingCalendarSetupScreen}
              options={{ headerShown: true, title: 'Calendar Setup' }}
            />
            <Stack.Screen
              name="Temperament"
              component={TemperamentScreen}
              options={{ headerShown: true, title: 'Temperament' }}
            />
            <Stack.Screen
              name="BusinessHours"
              component={BusinessHoursScreen}
              options={{ headerShown: true, title: 'Business Hours' }}
            />
            <Stack.Screen
              name="AccountSettings"
              component={AccountSettingsScreen}
              options={{ headerShown: true, title: 'Account' }}
            />
            <Stack.Screen
              name="CallerProfile"
              component={CallerProfileScreen}
              options={{ headerShown: true, title: 'Caller Profile' }}
            />
            <Stack.Screen
              name="MemoryList"
              component={MemoryListScreen}
              options={{ headerShown: true, title: 'Memories' }}
            />
            <Stack.Screen
              name="AccountHub"
              component={AccountHubScreen}
              options={{ headerShown: true, title: 'Account Hub' }}
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
              name="AddContact"
              component={AddContactScreen}
              options={{ headerShown: true, title: 'Add Contact' }}
            />
            <Stack.Screen
              name="CategoryDefaults"
              component={CategoryDefaultsScreen}
              options={{ headerShown: true, title: 'Screening Defaults' }}
            />
            <Stack.Screen
              name="PinSetup"
              component={PinSetupScreen}
              options={{ headerShown: true, title: 'Set PIN' }}
            />
            <Stack.Screen
              name="PinLogin"
              component={PinLoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="PaymentMethodsList"
              component={PaymentMethodsListScreen}
              options={{ headerShown: true, title: 'Payment Methods' }}
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
