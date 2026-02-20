import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '../../screens/WelcomeScreen';
import { ThemeProvider } from '../../theme/ThemeProvider';

const Stack = createNativeStackNavigator();

function DummyScreen() {
  return null;
}

function renderScreen() {
  return render(
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Register" component={DummyScreen} />
          <Stack.Screen name="Login" component={DummyScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}

describe('WelcomeScreen', () => {
  it('renders app title', () => {
    const { getByText } = renderScreen();
    expect(getByText('MattBot')).toBeTruthy();
  });

  it('has Create Account button', () => {
    const { getByText } = renderScreen();
    expect(getByText('Create Account')).toBeTruthy();
  });

  it('has Sign In button', () => {
    const { getByText } = renderScreen();
    expect(getByText('Sign In')).toBeTruthy();
  });
});
