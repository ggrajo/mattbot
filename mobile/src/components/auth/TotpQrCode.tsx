import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  uri: string;
  secret: string;
  onCopySecret: () => void;
}

export function TotpQrCode({ uri, secret, onCopySecret }: Props) {
  const theme = useTheme();
  const { colors, spacing, radii, typography } = theme;

  return (
    <View style={{ alignItems: 'center', gap: spacing.lg }}>
      <View
        style={{
          backgroundColor: '#FFFFFF',
          padding: spacing.lg,
          borderRadius: radii.lg,
        }}
      >
        <QRCode value={uri} size={200} />
      </View>
      <Text
        style={{ ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center' }}
        allowFontScaling
      >
        Scan this QR code with your authenticator app
      </Text>
      <TouchableOpacity
        onPress={onCopySecret}
        style={{
          backgroundColor: colors.surfaceVariant,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderRadius: radii.md,
        }}
        accessibilityLabel="Copy secret key to clipboard"
        accessibilityRole="button"
      >
        <Text style={{ ...typography.mono, color: colors.textPrimary }} allowFontScaling>
          {secret}
        </Text>
        <Text
          style={{ ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }}
          allowFontScaling
        >
          Tap to copy secret key
        </Text>
      </TouchableOpacity>
    </View>
  );
}
