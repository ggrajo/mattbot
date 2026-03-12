import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Icon } from './Icon';
import { Button } from './Button';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  message?: string;
  icon?: string;
  iconColor?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  loading?: boolean;
}

export function ConfirmSheet({
  visible,
  onDismiss,
  title,
  message,
  icon,
  iconColor,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  loading = false,
}: Props) {
  const theme = useTheme();
  const { colors, spacing, radii, typography, shadows } = theme;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}
        onPress={onDismiss}
      >
        <Pressable
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            padding: spacing.xl,
            paddingBottom: spacing.xxxl,
            gap: spacing.lg,
            ...shadows.modal,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.sm }} />

          {icon && (
            <View style={{ alignSelf: 'center' }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: (iconColor ?? (destructive ? colors.error : colors.primary)) + '18',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon
                  name={icon}
                  size="xl"
                  color={iconColor ?? (destructive ? colors.error : colors.primary)}
                />
              </View>
            </View>
          )}

          <Text
            style={{ ...typography.h3, color: colors.textPrimary, textAlign: 'center' }}
            allowFontScaling
          >
            {title}
          </Text>

          {message && (
            <Text
              style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center' }}
              allowFontScaling
            >
              {message}
            </Text>
          )}

          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            <Button
              title={confirmLabel}
              onPress={onConfirm}
              variant={destructive ? 'destructive' : 'primary'}
              loading={loading}
            />
            <Button
              title={cancelLabel}
              onPress={onDismiss}
              variant="ghost"
              disabled={loading}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
