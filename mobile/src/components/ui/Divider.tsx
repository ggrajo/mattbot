import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

interface Props {
  spacing?: number;
}

export function Divider({ spacing = 12 }: Props) {
  const theme = useTheme();

  return (
    <View
      style={{
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: spacing,
      }}
    />
  );
}
