import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { Icon } from './Icon';
import { Button } from './Button';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  message?: string;
}

export function SuccessModal({ visible, onDismiss, title, message }: Props) {
  const { colors, spacing, radii, typography, shadows } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        onPress={onDismiss}
      >
        <Pressable
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.xl,
            padding: spacing.xl,
            width: '85%',
            maxWidth: 340,
            gap: spacing.lg,
            ...shadows.modal,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={{ alignSelf: 'center' }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.success + '18',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="check-circle" size="xl" color={colors.success} />
            </View>
          </View>

          <Text
            style={{
              ...typography.h3,
              color: colors.textPrimary,
              textAlign: 'center',
            }}
            allowFontScaling
          >
            {title}
          </Text>

          {message && (
            <Text
              style={{
                ...typography.body,
                color: colors.textSecondary,
                textAlign: 'center',
              }}
              allowFontScaling
            >
              {message}
            </Text>
          )}

          <Button title="OK" onPress={onDismiss} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
