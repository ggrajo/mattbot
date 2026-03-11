import React, { useState } from 'react';
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

interface PinLoginScreenProps {
  onSuccess?: () => void;
}

export function PinLoginScreen({ onSuccess }: PinLoginScreenProps = {}) {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleKeyPress = (key: string) => {
    if (key === 'del') {
      setPin((p) => p.slice(0, -1));
      setError(false);
      return;
    }
    if (key === '' || pin.length >= PIN_LENGTH) return;

    const next = pin + key;
    setPin(next);

    if (next.length === PIN_LENGTH) {
      AsyncStorage.getItem(PIN_STORAGE_KEY).then((stored) => {
        if (next === stored) {
          if (onSuccess) {
            onSuccess();
          } else {
            navigation.goBack();
          }
        } else {
          setError(true);
          setPin('');
          Alert.alert('Incorrect PIN', 'The PIN you entered is incorrect.');
        }
      });
    }
  };

  const handleBiometric = () => {
    Alert.alert('Biometric', 'Biometric authentication would be triggered here.');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.container}>
        <FadeIn delay={0}>
          <Text style={[typography.h1, { color: colors.textPrimary, textAlign: 'center' }]}>
            Enter PIN
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
            Unlock MattBot with your PIN
          </Text>
        </FadeIn>

        <View style={styles.dotsRow}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i < pin.length ? (error ? colors.error : colors.primary) : 'transparent',
                  borderColor: error ? colors.error : colors.primary,
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

        <TouchableOpacity style={styles.biometricButton} onPress={handleBiometric}>
          <Text style={[typography.body, { color: colors.primary, fontWeight: '600' }]}>
            Use Biometrics
          </Text>
        </TouchableOpacity>
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
  biometricButton: {
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
});
