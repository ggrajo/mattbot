import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../../screens/LoginScreen';
import { ThemeProvider } from '../../theme/ThemeProvider';

jest.mock('../../api/auth', () => ({
  login: jest.fn(),
}));

const Stack = createNativeStackNavigator();

function DummyScreen() {
  return null;
}

function renderScreen() {
  return render(
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={DummyScreen} />
          <Stack.Screen name="ForgotPassword" component={DummyScreen} />
          <Stack.Screen name="MfaVerify" component={DummyScreen} />
          <Stack.Screen name="MfaEnroll" component={DummyScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}

describe('LoginScreen', () => {
  it('renders login form', () => {
    const { getByText } = renderScreen();
    expect(getByText('Welcome back')).toBeTruthy();
    expect(getByText('Email')).toBeTruthy();
    expect(getByText('Password')).toBeTruthy();
  });

  it('has forgot password link', () => {
    const { getByText } = renderScreen();
    expect(getByText('Forgot password?')).toBeTruthy();
  });

  it('shows validation errors on empty submit', async () => {
    const { getByText, findByText } = renderScreen();
    fireEvent.press(getByText('Sign In'));
    expect(await findByText('Email is required')).toBeTruthy();
  });
});
