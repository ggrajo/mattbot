import React from 'react';
import { View, Text, SafeAreaView, Image } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/ui/Button';
import { useTheme } from '../theme/ThemeProvider';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: spacing.xl,
          justifyContent: 'center',
          alignItems: 'center',
          gap: spacing.xxl,
        }}
      >
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          <Text style={{ ...typography.h1, color: colors.textPrimary }} allowFontScaling>
            MattBot
          </Text>
          <Text
            style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center' }}
            allowFontScaling
          >
            Secure communications for your team
          </Text>
        </View>

        <View style={{ width: '100%', gap: spacing.md }}>
          <Button
            title="Create Account"
            onPress={() => navigation.navigate('Register')}
            variant="primary"
          />
          <Button
            title="Sign In"
            onPress={() => navigation.navigate('Login')}
            variant="outline"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
