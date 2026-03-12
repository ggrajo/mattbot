import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput as RNTextInput,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (code: string) => void;
  autoFocus?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  autoFocus = false,
}: OtpInputProps) {
  const theme = useTheme();
  const { colors, typography, radii } = theme;
  const inputRef = useRef<RNTextInput>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const digits = value.split('').slice(0, length);
  const focusedIndex = Math.min(digits.length, length - 1);

  function handleChangeText(text: string) {
    const digitsOnly = text.replace(/\D/g, '').slice(0, length);
    onChange(digitsOnly);
  }

  function handlePressIn() {
    inputRef.current?.focus();
  }

  return (
    <TouchableWithoutFeedback onPress={handlePressIn} accessible={false}>
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
        {Array.from({ length }).map((_, i) => {
          const digit = digits[i];
          const focused = i === focusedIndex;
          return (
            <View
              key={i}
              style={{
                width: 48,
                height: 56,
                borderWidth: 2,
                borderColor: focused ? colors.primary : colors.border,
                borderRadius: radii.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surface,
              }}
            >
              <Text
                style={{
                  ...typography.h2,
                  color: digit ? colors.textPrimary : colors.textDisabled,
                }}
                allowFontScaling
              >
                {digit ?? '•'}
              </Text>
            </View>
          );
        })}
        <RNTextInput
          ref={inputRef}
          value={value}
          onChangeText={handleChangeText}
          keyboardType="number-pad"
          maxLength={length}
          autoComplete="one-time-code"
          autoFocus={autoFocus}
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            opacity: 0,
          }}
          accessibilityLabel="One-time code"
        />
      </View>
    </TouchableWithoutFeedback>
  );
}
