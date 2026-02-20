import React from 'react';
import { render } from '@testing-library/react-native';
import { Toast } from '../../components/ui/Toast';
import { ThemeProvider } from '../../theme/ThemeProvider';

describe('Toast', () => {
  it('renders message when visible', () => {
    const { getByText } = render(
      <ThemeProvider>
        <Toast message="Success!" type="success" visible={true} onDismiss={() => {}} />
      </ThemeProvider>
    );
    expect(getByText('Success!')).toBeTruthy();
  });

  it('returns null when not visible', () => {
    const { queryByText } = render(
      <ThemeProvider>
        <Toast message="Hidden" visible={false} onDismiss={() => {}} />
      </ThemeProvider>
    );
    expect(queryByText('Hidden')).toBeNull();
  });

  it('renders with accessibilityRole alert', () => {
    const { UNSAFE_getByProps } = render(
      <ThemeProvider>
        <Toast message="Alert" visible={true} onDismiss={() => {}} />
      </ThemeProvider>
    );
    expect(UNSAFE_getByProps({ accessibilityRole: 'alert' })).toBeTruthy();
  });
});
