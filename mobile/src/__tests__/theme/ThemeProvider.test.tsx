import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../../theme/ThemeProvider';

function ThemeConsumer() {
  const theme = useTheme();
  return <Text testID="bg">{theme.colors.background}</Text>;
}

describe('ThemeProvider', () => {
  it('provides light theme by default', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );
    // Light theme background
    expect(getByTestId('bg').props.children).toBe('#F8F9FA');
  });
});
