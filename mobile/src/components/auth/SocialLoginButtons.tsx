import React from 'react';
import { View, Platform } from 'react-native';
import { Button } from '../ui/Button';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  onGooglePress: () => void;
  onApplePress: () => void;
  loading?: boolean;
}

export function SocialLoginButtons({ onGooglePress, onApplePress, loading }: Props) {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Button
        title="Continue with Google"
        variant="outline"
        onPress={onGooglePress}
        loading={loading}
        accessibilityLabel="Sign in with Google"
      />
      {Platform.OS === 'ios' && (
        <Button
          title="Continue with Apple"
          variant="outline"
          onPress={onApplePress}
          loading={loading}
          accessibilityLabel="Sign in with Apple"
        />
      )}
    </View>
  );
}
