import React from 'react';
import { View, Platform } from 'react-native';
import { Button } from '../ui/Button';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  onGooglePress: () => void;
  onApplePress: () => void;
  loading?: boolean;
  mode?: 'signin' | 'signup';
}

export function SocialLoginButtons({ onGooglePress, onApplePress, loading, mode = 'signin' }: Props) {
  const theme = useTheme();
  const googleLabel = mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google';
  const appleLabel = mode === 'signup' ? 'Sign up with Apple' : 'Sign in with Apple';

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Button
        title={googleLabel}
        variant="outline"
        onPress={onGooglePress}
        loading={loading}
        accessibilityLabel={googleLabel}
      />
      {Platform.OS === 'ios' && (
        <Button
          title={appleLabel}
          variant="outline"
          onPress={onApplePress}
          loading={loading}
          accessibilityLabel={appleLabel}
        />
      )}
    </View>
  );
}
