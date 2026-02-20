import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TextInput } from '../../components/ui/TextInput';
import { ThemeProvider } from '../../theme/ThemeProvider';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('TextInput', () => {
  it('renders label', () => {
    const { getByText } = renderWithTheme(<TextInput label="Email" />);
    expect(getByText('Email')).toBeTruthy();
  });

  it('shows error message', () => {
    const { getByText } = renderWithTheme(<TextInput label="Email" error="Invalid email" />);
    expect(getByText('Invalid email')).toBeTruthy();
  });

  it('handles text input', () => {
    const onChangeText = jest.fn();
    const { getByLabelText } = renderWithTheme(
      <TextInput label="Name" onChangeText={onChangeText} />
    );
    fireEvent.changeText(getByLabelText('Name'), 'John');
    expect(onChangeText).toHaveBeenCalledWith('John');
  });

  it('shows/hides password toggle for password fields', () => {
    const { getByText } = renderWithTheme(<TextInput label="Password" isPassword />);
    expect(getByText('Show')).toBeTruthy();
    fireEvent.press(getByText('Show'));
    expect(getByText('Hide')).toBeTruthy();
  });

  it('has error accessibility role on error', () => {
    const { getByRole } = renderWithTheme(<TextInput label="Email" error="Required" />);
    expect(getByRole('alert')).toBeTruthy();
  });
});
