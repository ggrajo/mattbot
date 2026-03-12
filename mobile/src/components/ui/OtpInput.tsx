import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
}

export function OtpInput({ length = 6, value, onChange, error, autoFocus = true }: Props) {
  const theme = useTheme();
  const { colors, spacing, radii, typography } = theme;
  const refs = useRef<(RNTextInput | null)[]>([]);
  const [focused, setFocused] = useState(autoFocus ? 0 : -1);

  const digits = value.split('').concat(Array(length).fill('')).slice(0, length);

  useEffect(() => {
    if (autoFocus && refs.current[0]) {
      refs.current[0]?.focus();
    }
  }, []);

  function handleChange(text: string, index: number) {
    if (text.length > 1) {
      const pasted = text.replace(/\D/g, '').slice(0, length);
      onChange(pasted);
      const nextIdx = Math.min(pasted.length, length - 1);
      refs.current[nextIdx]?.focus();
      return;
    }

    const digit = text.replace(/\D/g, '');
    const arr = value.split('');
    arr[index] = digit;
    const newVal = arr.join('').slice(0, length);
    onChange(newVal);

    if (digit && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
      const arr = value.split('');
      arr[index - 1] = '';
      onChange(arr.join(''));
    }
  }

  const borderColor = error ? colors.error : colors.border;
  const focusedBorderColor = error ? colors.error : colors.borderFocused;

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.sm }}>
        {digits.map((digit, i) => {
          const isFocused = focused === i;
          return (
            <View
              key={i}
              style={{
                width: 46,
                height: 56,
                borderWidth: isFocused ? 2 : 1.5,
                borderColor: isFocused ? focusedBorderColor : borderColor,
                borderRadius: radii.md,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RNTextInput
                ref={(el) => { refs.current[i] = el; }}
                value={digit}
                onChangeText={(t) => handleChange(t, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                onFocus={() => setFocused(i)}
                onBlur={() => setFocused(-1)}
                keyboardType="number-pad"
                maxLength={i === 0 ? length : 1}
                style={{
                  ...typography.h2,
                  color: colors.textPrimary,
                  textAlign: 'center',
                  width: '100%',
                  height: '100%',
                  padding: 0,
                }}
                accessibilityLabel={`Digit ${i + 1} of ${length}`}
                selectionColor={colors.primary}
              />
            </View>
          );
        })}
      </View>
      {error && (
        <Text
          style={{ ...typography.caption, color: colors.error, textAlign: 'center' }}
          accessibilityRole="alert"
        >
          {error}
        </Text>
      )}
    </View>
  );
}
