import React, { useState } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInputProps as RNTextInputProps,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface Props extends Omit<RNTextInputProps, 'style'> {
  label: string;
  error?: string;
  isPassword?: boolean;
  containerStyle?: object;
}

export function TextInput({
  label,
  error,
  isPassword = false,
  containerStyle,
  ...rest
}: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { colors, spacing, radii, typography } = theme;

  const borderColor = error ? colors.error : focused ? colors.borderFocused : colors.border;

  return (
    <View style={[{ marginBottom: spacing.lg }, containerStyle]}>
      <Text
        style={{
          ...typography.bodySmall,
          color: error ? colors.error : colors.textSecondary,
          marginBottom: spacing.xs,
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
          borderRadius: radii.md,
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.md,
        }}
      >
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
            paddingVertical: spacing.md,
          }}
          placeholderTextColor={colors.textDisabled}
          allowFontScaling
          accessibilityLabel={label}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={{ color: colors.textSecondary, ...typography.bodySmall }}>
              {showPassword ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
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
