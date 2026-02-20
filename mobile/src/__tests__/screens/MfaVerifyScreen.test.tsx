import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MfaVerifyScreen } from '../../screens/MfaVerifyScreen';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { useAuthStore } from '../../store/authStore';

jest.mock('../../api/auth', () => ({
  mfaVerify: jest.fn(),
}));

const Stack = createNativeStackNavigator();

function renderScreen() {
  useAuthStore.setState({ mfaChallengeToken: 'challenge_token_123' });
  return render(
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="MfaVerify" component={MfaVerifyScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}

describe('MfaVerifyScreen', () => {
  it('renders TOTP input by default', () => {
    const { getByText } = renderScreen();
    expect(getByText('Two-factor authentication')).toBeTruthy();
    expect(getByText('Authenticator code')).toBeTruthy();
  });

  it('switches to recovery code mode', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Use recovery code instead'));
    expect(getByText('Recovery code')).toBeTruthy();
  });

  it('switches back to TOTP mode', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Use recovery code instead'));
    fireEvent.press(getByText('Use authenticator code instead'));
    expect(getByText('Authenticator code')).toBeTruthy();
  });
});
