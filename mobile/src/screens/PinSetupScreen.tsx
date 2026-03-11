import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PIN_LENGTH = 4;
const PIN_STORAGE_KEY = 'mattbot_app_pin';
const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export function PinSetupScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const navigation = useNavigation<any>();
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const firstPin = useRef('');

  const currentPin = step === 'enter' ? pin : confirmPin;
  const setCurrentPin = step === 'enter' ? setPin : setConfirmPin;

  const handleKeyPress = (key: string) => {
    if (key === 'del') {
      setCurrentPin((p) => p.slice(0, -1));
      return;
    }
    if (key === '') return;
    if (currentPin.length >= PIN_LENGTH) return;

    const next = currentPin + key;
    setCurrentPin(next);

    if (next.length === PIN_LENGTH) {
      if (step === 'enter') {
        firstPin.current = next;
        setTimeout(() => {
          setStep('confirm');
          setConfirmPin('');
        }, 200);
      } else {
        if (next === firstPin.current) {
          AsyncStorage.setItem(PIN_STORAGE_KEY, next).then(() => {
            Alert.alert('PIN Set', 'Your app PIN has been saved.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          });
        } else {
          Alert.alert('Mismatch', 'PINs do not match. Please try again.');
          setStep('enter');
          setPin('');
          setConfirmPin('');
          firstPin.current = '';
        }
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.container}>
        <FadeIn delay={0}>
          <Text style={[typography.h1, { color: colors.textPrimary, textAlign: 'center' }]}>
            {step === 'enter' ? 'Set Your PIN' : 'Confirm PIN'}
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
            {step === 'enter' ? 'Enter a 4-digit PIN' : 'Re-enter your PIN to confirm'}
          </Text>
        </FadeIn>

        <View style={styles.dotsRow}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i < currentPin.length ? colors.primary : 'transparent',
                  borderColor: colors.primary,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.keypad}>
          {KEYPAD.map((key, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.keypadButton,
                {
                  backgroundColor: key ? colors.surface : 'transparent',
                  borderColor: key ? colors.border : 'transparent',
                  borderRadius: radii.md,
                },
              ]}
              activeOpacity={key ? 0.6 : 1}
              onPress={() => handleKeyPress(key)}
              disabled={!key}
            >
              <Text style={[styles.keypadText, { color: key === 'del' ? colors.error : colors.textPrimary }]}>
                {key === 'del' ? '⌫' : key}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
    marginVertical: 40,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 260,
    gap: 12,
    justifyContent: 'center',
  },
  keypadButton: {
    width: 72,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  keypadText: {
    fontSize: 22,
    fontWeight: '600',
  },
});
