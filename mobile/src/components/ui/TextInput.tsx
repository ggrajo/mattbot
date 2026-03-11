import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  TouchableOpacity,
  Animated,
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
  value,
  ...rest
}: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const { colors, spacing, radii, typography } = theme;

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [focused, borderAnim]);

  const borderColor = error
    ? colors.error
    : (borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.border, colors.borderFocused],
      }) as unknown as string);

  const labelColor = error
    ? colors.error
    : focused
      ? colors.primary
      : colors.textSecondary;

  return (
    <View style={[{ marginBottom: spacing.lg }, containerStyle]}>
      <Text
        style={{
          ...typography.bodySmall,
          fontWeight: '500',
          color: labelColor,
          marginBottom: spacing.xs + 2,
        }}
        accessibilityRole="text"
      >
        {label}
      </Text>
      <Animated.View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: focused ? 2 : 1.5,
          borderColor,
          borderRadius: radii.md,
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.md,
        }}
      >
        <RNTextInput
          {...rest}
          value={value}
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
            <Text style={{ color: colors.primary, ...typography.bodySmall, fontWeight: '600' }}>
              {showPassword ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>
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
