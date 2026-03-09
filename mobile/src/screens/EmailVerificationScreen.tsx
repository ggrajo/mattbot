import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { StatusScreen } from '../components/ui/StatusScreen';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import { useTheme } from '../theme/ThemeProvider';
import { verifyEmail } from '../api/auth';
import { extractApiError } from '../api/client';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EmailVerification'>;

export function EmailVerificationScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing } = theme;

  const token = route.params?.token;
  const email = route.params?.email;
  const [loading, setLoading] = useState(!!token);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState<string>();

  useEffect(() => {
    if (token) {
      handleVerify(token);
    }
  }, [token]);

  async function handleVerify(verificationToken: string) {
    setLoading(true);
    try {
      await verifyEmail(verificationToken);
      setSuccess(true);
    } catch (error) {
      setApiError(extractApiError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenWrapper scroll={false} keyboardAvoiding={false}>
      <LoadingOverlay visible={loading} message="Verifying email..." />

      {success ? (
        <StatusScreen
          icon="check-circle-outline"
          iconColor={colors.success}
          title="Email verified!"
          subtitle="Your email has been verified successfully. You can now sign in."
          action={{ title: 'Go to Sign In', onPress: () => navigation.navigate('Login') }}
        />
      ) : !token ? (
        <StatusScreen
          icon="email-check-outline"
          iconColor={colors.primary}
          title="Check your inbox"
          subtitle={
            email
              ? `We've sent a verification link to ${email}. Please click the link to verify your account.`
              : "We've sent a verification link to your email address. Please click the link to verify your account."
          }
          action={{ title: 'Go to Sign In', onPress: () => navigation.navigate('Login'), variant: 'outline' }}
        />
      ) : apiError ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl }}>
          <ErrorMessage message={apiError} action="Retry" onAction={() => handleVerify(token)} />
        </View>
      ) : null}
    </ScreenWrapper>
  );
}
