import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, AppState, AppStateStatus } from 'react-native';
import { Button } from './Button';
import { Icon } from './Icon';
import { useTheme } from '../../theme/ThemeProvider';
import { useBiometric } from '../../hooks/useBiometric';

interface Props {
  children: React.ReactNode;
  enabled: boolean;
  promptMessage?: string;
}

export function BiometricGate({
  children,
  enabled,
  promptMessage = 'Authenticate to view sensitive content',
}: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const { available, biometryType, authenticate } = useBiometric();
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState<string>();

  const handleAppState = useCallback((state: AppStateStatus) => {
    if (state === 'background' || state === 'inactive') {
      setUnlocked(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setUnlocked(true);
      return;
    }
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [enabled, handleAppState]);

  async function handleUnlock() {
    setError(undefined);
    const success = await authenticate(promptMessage);
    if (success) {
      setUnlocked(true);
    } else {
      setError('Authentication failed. Please try again.');
    }
  }

  if (!enabled || unlocked || !available) {
    return <>{children}</>;
  }

  const biometricLabel =
    biometryType === 'FaceID'
      ? 'Face ID'
      : biometryType === 'TouchID'
        ? 'Touch ID'
        : 'Biometrics';

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        gap: spacing.lg,
      }}
    >
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: radii.xl,
          backgroundColor: colors.primary + '14',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon
          name={biometryType === 'FaceID' ? 'face-recognition' : 'fingerprint'}
          size={40}
          color={colors.primary}
        />
      </View>

      <Text
        style={{ ...typography.h3, color: colors.textPrimary, textAlign: 'center' }}
        allowFontScaling
      >
        Content Protected
      </Text>
      <Text
        style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center' }}
        allowFontScaling
      >
        {available
          ? `Unlock with ${biometricLabel} to view this content.`
          : 'Biometric authentication is not available on this device.'}
      </Text>

      {error && (
        <Text
          style={{ ...typography.bodySmall, color: colors.error, textAlign: 'center' }}
          allowFontScaling
        >
          {error}
        </Text>
      )}

      {available && (
        <Button
          title={`Unlock with ${biometricLabel}`}
          icon={biometryType === 'FaceID' ? 'face-recognition' : 'fingerprint'}
          onPress={handleUnlock}
        />
      )}
    </View>
  );
}
