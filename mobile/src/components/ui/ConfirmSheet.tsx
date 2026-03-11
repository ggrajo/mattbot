import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  onDismiss?: () => void;
  icon?: string;
  iconColor?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

export function ConfirmSheet({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  onDismiss,
  icon,
  iconColor,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
}: Props) {
  const theme = useTheme();
  const { colors, spacing, radii, typography } = theme;
  const handleDismiss = onDismiss || onCancel || (() => {});

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <Pressable
        style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.6)', padding: spacing.xl }]}
        onPress={handleDismiss}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            padding: spacing.xl,
            width: '100%',
            maxWidth: 340,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {icon && (
            <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
              <Icon name={icon} size="xl" color={iconColor || (destructive ? colors.error : colors.primary)} />
            </View>
          )}
          <Text
            style={{
              ...typography.h3,
              color: colors.textPrimary,
              marginBottom: spacing.sm,
              textAlign: icon ? 'center' : 'left',
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              ...typography.body,
              color: colors.textSecondary,
              marginBottom: spacing.xl,
              textAlign: icon ? 'center' : 'left',
              lineHeight: 22,
            }}
          >
            {message}
          </Text>
          <View style={{ gap: spacing.sm }}>
            <Pressable
              onPress={onConfirm}
              disabled={loading}
              style={{
                paddingVertical: spacing.md,
                borderRadius: radii.md,
                backgroundColor: destructive ? colors.error : colors.primary,
                alignItems: 'center',
                opacity: loading ? 0.6 : 1,
              }}
            >
              <Text style={{ ...typography.button, color: colors.onPrimary }}>
                {loading ? 'Please wait…' : confirmLabel}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleDismiss}
              style={{
                paddingVertical: spacing.md,
                borderRadius: radii.md,
                alignItems: 'center',
              }}
            >
              <Text style={{ ...typography.button, color: colors.textSecondary }}>{cancelLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
