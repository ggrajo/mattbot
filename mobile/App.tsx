import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { RootNavigator } from './src/navigation/RootNavigator';

let stripeKey = '';
try {
  const Config = require('react-native-config').default;
  stripeKey = Config?.STRIPE_PUBLISHABLE_KEY ?? '';
} catch {}

export default function App() {
  const inner = (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );

  if (stripeKey) {
    return (
      <StripeProvider publishableKey={stripeKey}>
        {inner}
      </StripeProvider>
    );
  }

  return inner;
}
