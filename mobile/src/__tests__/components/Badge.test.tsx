import React from 'react';
import { render } from '@testing-library/react-native';
import { Badge } from '../../components/ui/Badge';
import { ThemeProvider } from '../../theme/ThemeProvider';

describe('Badge', () => {
  it('renders label text', () => {
    const { getByText } = render(
      <ThemeProvider>
        <Badge label="Active" variant="success" />
      </ThemeProvider>
    );
    expect(getByText('Active')).toBeTruthy();
  });

  it('renders all variants without crashing', () => {
    const variants = ['primary', 'success', 'warning', 'error'] as const;
    variants.forEach(variant => {
      const { getByText } = render(
        <ThemeProvider>
          <Badge label={variant} variant={variant} />
        </ThemeProvider>
      );
      expect(getByText(variant)).toBeTruthy();
    });
  });
});
