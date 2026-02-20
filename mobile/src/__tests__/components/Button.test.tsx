import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../../components/ui/Button';
import { ThemeProvider } from '../../theme/ThemeProvider';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('Button', () => {
  it('renders title text', () => {
    const { getByText } = renderWithTheme(<Button title="Click me" onPress={() => {}} />);
    expect(getByText('Click me')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByRole } = renderWithTheme(<Button title="Tap" onPress={onPress} />);
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByRole } = renderWithTheme(<Button title="Disabled" onPress={onPress} disabled />);
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows loading indicator when loading', () => {
    const { queryByText, getByRole } = renderWithTheme(
      <Button title="Loading" onPress={() => {}} loading />
    );
    expect(queryByText('Loading')).toBeNull();
    expect(getByRole('button').props.accessibilityState.busy).toBe(true);
  });

  it('sets accessibility label from title', () => {
    const { getByLabelText } = renderWithTheme(
      <Button title="Sign In" onPress={() => {}} />
    );
    expect(getByLabelText('Sign In')).toBeTruthy();
  });

  it('accepts custom accessibility label', () => {
    const { getByLabelText } = renderWithTheme(
      <Button title="Go" onPress={() => {}} accessibilityLabel="Navigate forward" />
    );
    expect(getByLabelText('Navigate forward')).toBeTruthy();
  });
});
