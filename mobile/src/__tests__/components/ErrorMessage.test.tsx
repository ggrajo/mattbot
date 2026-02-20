import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { ThemeProvider } from '../../theme/ThemeProvider';

describe('ErrorMessage', () => {
  it('renders error text', () => {
    const { getByText } = render(
      <ThemeProvider>
        <ErrorMessage message="Something went wrong" />
      </ThemeProvider>
    );
    expect(getByText('Something went wrong')).toBeTruthy();
  });

  it('renders action button when provided', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <ThemeProvider>
        <ErrorMessage message="Error" action="Retry" onAction={onAction} />
      </ThemeProvider>
    );
    fireEvent.press(getByText('Retry'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders with accessibilityRole alert', () => {
    const { UNSAFE_getByProps } = render(
      <ThemeProvider>
        <ErrorMessage message="Error" />
      </ThemeProvider>
    );
    expect(UNSAFE_getByProps({ accessibilityRole: 'alert' })).toBeTruthy();
  });
});
