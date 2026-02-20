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
import { HomeScreen } from '../screens/HomeScreen';
import { DeviceListScreen } from '../screens/DeviceListScreen';

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
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="DeviceList"
              component={DeviceListScreen}
              options={{ headerShown: true, title: 'Devices' }}
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
