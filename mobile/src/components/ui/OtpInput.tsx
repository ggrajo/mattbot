import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  length?: number;
  value: string;
  onChange: (val: string) => void;
}

export function OtpInput({ length = 6, value, onChange }: Props) {
  const theme = useTheme();

  const handleChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, length);
    onChange(cleaned);
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        style={[
          styles.input,
          {
            color: theme.colors.textPrimary,
            borderColor: theme.colors.border,
          },
        ]}
        placeholder={Array(length).fill('•').join('')}
        placeholderTextColor={theme.colors.textDisabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  input: {
    width: 200,
    fontSize: 24,
    letterSpacing: 12,
    textAlign: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
});
