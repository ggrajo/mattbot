import React, { useState } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  TextInputProps as RNTextInputProps,
  Platform,
} from 'react-native';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { useTheme } from '../../theme/ThemeProvider';

interface Props extends Omit<RNTextInputProps, 'style'> {
  label: string;
  error?: string;
  isPassword?: boolean;
  leftIcon?: string;
  containerStyle?: object;
}

export function TextInput({
  label,
  error,
  isPassword = false,
  leftIcon,
  containerStyle,
  ...rest
}: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { colors, spacing, radii, typography } = theme;

  const borderColor = error
    ? colors.error
    : focused
      ? colors.borderFocused
      : colors.border;

  const focusGlow = focused && !error && Platform.OS === 'ios'
    ? {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      }
    : {};

  return (
    <View style={[{ marginBottom: spacing.lg }, containerStyle]}>
      <Text
        style={{
          ...typography.bodySmall,
          color: error ? colors.error : colors.textSecondary,
          marginBottom: spacing.xs,
          fontWeight: '500',
        }}
        accessibilityRole="text"
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1.5,
          borderColor,
          borderRadius: radii.lg,
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.md,
          gap: spacing.sm,
          ...focusGlow,
        }}
      >
        {leftIcon && (
          <Icon
            name={leftIcon}
            size="md"
            color={focused ? colors.borderFocused : colors.textDisabled}
          />
        )}
        <RNTextInput
          {...rest}
          secureTextEntry={isPassword && !showPassword}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={{
            flex: 1,
            ...typography.body,
            color: colors.textPrimary,
            paddingVertical: spacing.md + 2,
          }}
          placeholderTextColor={colors.textDisabled}
          allowFontScaling
          accessibilityLabel={label}
        />
        {isPassword && (
          <IconButton
            icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            onPress={() => setShowPassword(!showPassword)}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            size="md"
            color={colors.textSecondary}
          />
        )}
      </View>
      {error && (
        <Text
          style={{
            ...typography.caption,
            color: colors.error,
            marginTop: spacing.xs,
          }}
          accessibilityRole="alert"
        >
          {error}
        </Text>
      )}
    </View>
  );
}
