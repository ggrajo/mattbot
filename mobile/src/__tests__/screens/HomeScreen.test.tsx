import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../../screens/HomeScreen';
import { ThemeProvider } from '../../theme/ThemeProvider';

jest.mock('../../api/auth', () => ({
  logout: jest.fn(),
  logoutAll: jest.fn(),
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
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="DeviceList" component={DummyScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}

describe('HomeScreen', () => {
  it('renders the home screen', () => {
    const { getByText } = renderScreen();
    expect(getByText('MattBot')).toBeTruthy();
  });

  it('shows device management button', () => {
    const { getByText } = renderScreen();
    expect(getByText('Manage Devices')).toBeTruthy();
  });

  it('shows sign out button', () => {
    const { getByText } = renderScreen();
    expect(getByText('Sign Out')).toBeTruthy();
  });

  it('shows sign out all devices button', () => {
    const { getByText } = renderScreen();
    expect(getByText('Sign Out All Devices')).toBeTruthy();
  });
});
