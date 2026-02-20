import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/ui/Button';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import { useTheme } from '../theme/ThemeProvider';
import { verifyEmail } from '../api/auth';
import { extractApiError } from '../api/client';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EmailVerification'>;

export function EmailVerificationScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;

  const token = route.params?.token;
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <LoadingOverlay visible={loading} message="Verifying email..." />
      <View
        style={{
          flex: 1,
          padding: spacing.xl,
          justifyContent: 'center',
          alignItems: 'center',
          gap: spacing.lg,
        }}
      >
        {success ? (
          <>
            <Text
              style={{ ...typography.h2, color: colors.success, textAlign: 'center' }}
              allowFontScaling
            >
              Email verified!
            </Text>
            <Text
              style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center' }}
              allowFontScaling
            >
              Your email has been verified successfully. You can now sign in.
            </Text>
            <Button
              title="Go to Sign In"
              onPress={() => navigation.navigate('Login')}
            />
          </>
        ) : !token ? (
          <>
            <Text
              style={{ ...typography.h2, color: colors.textPrimary, textAlign: 'center' }}
              allowFontScaling
            >
              Check your email
            </Text>
            <Text
              style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center' }}
              allowFontScaling
            >
              We've sent a verification link to your email address.
              Please click the link to verify your account.
            </Text>
            <Button
              title="Go to Sign In"
              onPress={() => navigation.navigate('Login')}
              variant="outline"
            />
          </>
        ) : apiError ? (
          <>
            <ErrorMessage message={apiError} />
            <Button
              title="Go to Sign In"
              onPress={() => navigation.navigate('Login')}
              variant="outline"
            />
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
