import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RegisterScreen } from '../../screens/RegisterScreen';
import { ThemeProvider } from '../../theme/ThemeProvider';

jest.mock('../../api/auth', () => ({
  register: jest.fn(),
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
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Login" component={DummyScreen} />
          <Stack.Screen name="MfaEnroll" component={DummyScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}

describe('RegisterScreen', () => {
  it('renders the form fields', () => {
    const { getByText } = renderScreen();
    expect(getByText('Create your account')).toBeTruthy();
    expect(getByText('Email')).toBeTruthy();
    expect(getByText('Password')).toBeTruthy();
    expect(getByText('Confirm Password')).toBeTruthy();
  });

  it('shows validation errors on empty submit', async () => {
    const { getByText, findByText } = renderScreen();
    fireEvent.press(getByText('Create Account'));
    expect(await findByText('Email is required')).toBeTruthy();
  });

  it('shows password mismatch error', async () => {
    const { getByLabelText, getByText, findByText } = renderScreen();
    fireEvent.changeText(getByLabelText('Email'), 'user@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'MySecurePass123');
    fireEvent.changeText(getByLabelText('Confirm Password'), 'DifferentPass123');
    fireEvent.press(getByText('Create Account'));
    expect(await findByText('Passwords do not match')).toBeTruthy();
  });
});
