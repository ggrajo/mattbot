import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export function ConfirmSheet({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  destructive = false,
}: Props) {
  const theme = useTheme();
  const { colors, spacing, radii, typography } = theme;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable
        style={{
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.xl,
        }}
        onPress={onCancel}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            padding: spacing.xl,
            width: '100%',
            maxWidth: 320,
          }}
        >
          <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm }}>
            {title}
          </Text>
          <Text style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl }}>
            {message}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.md, justifyContent: 'flex-end' }}>
            <Pressable
              onPress={onCancel}
              style={{
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
                borderRadius: radii.md,
              }}
            >
              <Text style={{ ...typography.button, color: colors.textSecondary }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={{
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
                borderRadius: radii.md,
                backgroundColor: destructive ? colors.error : colors.primary,
              }}
            >
              <Text style={{ ...typography.button, color: colors.onPrimary }}>Confirm</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
