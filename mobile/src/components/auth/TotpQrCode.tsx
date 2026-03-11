import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Icon } from '../ui/Icon';
import { Card } from '../ui/Card';
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
      <Card
        variant="elevated"
        style={{
          alignItems: 'center',
          padding: spacing.xl,
          backgroundColor: '#FFFFFF',
        }}
      >
        <QRCode value={uri} size={200} />
      </Card>

      <Text
        style={{ ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center' }}
        allowFontScaling
      >
        Scan this QR code with your authenticator app
      </Text>

      <TouchableOpacity
        onPress={onCopySecret}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: colors.surfaceVariant,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderRadius: radii.md,
        }}
        accessibilityLabel="Copy secret key to clipboard"
        accessibilityRole="button"
        activeOpacity={0.7}
      >
        <Text style={{ ...typography.mono, color: colors.textPrimary, flex: 1 }} allowFontScaling>
          {secret}
        </Text>
        <Icon name="content-copy" size="md" color={colors.primary} />
      </TouchableOpacity>

      <Text
        style={{ ...typography.caption, color: colors.textSecondary, textAlign: 'center' }}
        allowFontScaling
      >
        Can't scan? Tap the code above to copy it
      </Text>
    </View>
  );
}
