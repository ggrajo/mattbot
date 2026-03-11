import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  Animated,
  TextInputProps,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface Props extends Omit<TextInputProps, 'style' | 'value' | 'onChangeText'> {
  label?: string;
  value: string;
  onChangeText: (e164: string) => void;
  error?: string;
  countryCode?: string;
  containerStyle?: object;
}

function stripNonDigits(raw: string): string {
  return raw.replace(/[^\d]/g, '');
}

function toE164(digits: string, defaultCode: string): string {
  if (digits.startsWith('+')) return digits;
  const clean = stripNonDigits(digits);
  if (!clean) return '';
  if (clean.length >= 10 && !clean.startsWith('1') && defaultCode === '+1') {
    return `+1${clean}`;
  }
  if (clean.startsWith('1') && clean.length === 11) {
    return `+${clean}`;
  }
  return `${defaultCode}${clean}`;
}

function formatDisplay(e164: string): string {
  if (!e164) return '';
  const digits = stripNonDigits(e164);
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return e164;
}

export function PhoneInput({
  label = 'Phone Number',
  value,
  onChangeText,
  error,
  countryCode = '+1',
  containerStyle,
  ...rest
}: Props) {
  const theme = useTheme();
  const { colors, spacing, radii, typography } = theme;
  const [display, setDisplay] = useState(() => formatDisplay(value));
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;
  const lastExternalValue = useRef(value);

  useEffect(() => {
    if (value !== lastExternalValue.current) {
      lastExternalValue.current = value;
      setDisplay(formatDisplay(value));
    }
  }, [value]);

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [focused, borderAnim]);

  const handleChange = useCallback(
    (text: string) => {
      setDisplay(text);
      const e164 = toE164(text, countryCode);
      lastExternalValue.current = e164;
      onChangeText(e164);
    },
    [countryCode, onChangeText],
  );

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
        <Text
          style={{
            ...typography.body,
            color: colors.textSecondary,
            marginRight: spacing.sm,
          }}
        >
          {countryCode}
        </Text>
        <View
          style={{
            width: 1,
            height: 20,
            backgroundColor: colors.border,
            marginRight: spacing.sm,
          }}
        />
        <RNTextInput
          {...rest}
          value={display}
          onChangeText={handleChange}
          keyboardType="phone-pad"
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            setDisplay(formatDisplay(lastExternalValue.current));
            rest.onBlur?.(e);
          }}
          style={{
            flex: 1,
            ...typography.body,
            color: colors.textPrimary,
            paddingVertical: spacing.md,
          }}
          placeholderTextColor={colors.textDisabled}
          placeholder="(555) 123-4567"
          accessibilityLabel={label}
        />
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
