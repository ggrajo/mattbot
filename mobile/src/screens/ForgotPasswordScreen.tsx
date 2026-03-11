import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';
import { StatusScreen } from '../components/ui/StatusScreen';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useTheme } from '../theme/ThemeProvider';
import { requestPasswordReset } from '../api/auth';
import { extractApiError } from '../api/client';
import { validateField, emailSchema } from '../utils/validation';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [apiError, setApiError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    const eErr = validateField(emailSchema, email);
    setEmailError(eErr);
    setApiError(undefined);
    if (eErr) return;

    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (error) {
      setApiError(extractApiError(error));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <ScreenWrapper scroll={false} keyboardAvoiding={false}>
        <StatusScreen
          icon="email-fast-outline"
          iconColor={colors.primary}
          title="Check your email"
          subtitle={`If an account exists for ${email}, you'll receive a password reset link shortly.`}
          action={{ title: 'Back to Sign In', onPress: () => navigation.navigate('Login'), variant: 'outline' }}
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={{ gap: spacing.sm, marginBottom: spacing.xl }}>
        <Text style={{ ...typography.h2, color: colors.textPrimary }} allowFontScaling>
          Reset password
        </Text>
        <Text style={{ ...typography.body, color: colors.textSecondary }} allowFontScaling>
          Enter your email and we'll send you a reset link.
        </Text>
      </View>

      {apiError && <ErrorMessage message={apiError} />}

      <TextInput
        label="Email"
        leftIcon="email-outline"
        value={email}
        onChangeText={setEmail}
        error={emailError}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />

      <Button
        title="Send Reset Link"
        icon="email-fast-outline"
        onPress={handleSubmit}
        loading={loading}
      />

      <Button
        title="Back to Sign In"
        onPress={() => navigation.goBack()}
        variant="ghost"
      />
    </ScreenWrapper>
  );
}
