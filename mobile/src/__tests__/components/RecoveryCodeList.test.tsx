import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RecoveryCodeList } from '../../components/auth/RecoveryCodeList';
import { ThemeProvider } from '../../theme/ThemeProvider';

describe('RecoveryCodeList', () => {
  const codes = ['ABCD-1234', 'EFGH-5678', 'IJKL-9012'];

  it('renders all recovery codes', () => {
    const { getByText } = render(
      <ThemeProvider>
        <RecoveryCodeList codes={codes} onCopyAll={() => {}} />
      </ThemeProvider>
    );
    codes.forEach(code => {
      expect(getByText(code)).toBeTruthy();
    });
  });

  it('calls onCopyAll when copy button is pressed', () => {
    const onCopyAll = jest.fn();
    const { getByText } = render(
      <ThemeProvider>
        <RecoveryCodeList codes={codes} onCopyAll={onCopyAll} />
      </ThemeProvider>
    );
    fireEvent.press(getByText('Copy all codes'));
    expect(onCopyAll).toHaveBeenCalledTimes(1);
  });
});
