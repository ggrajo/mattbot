import React, { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../components/ui/Card';
import { FadeIn } from '../components/ui/FadeIn';
import { Button } from '../components/ui/Button';
import { useTheme } from '../theme/ThemeProvider';
import { useCalendarStore } from '../store/calendarStore';
import type { Theme } from '../theme/tokens';

export function OnboardingCalendarSetupScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const navigation = useNavigation<any>();
  const { connect, loading } = useCalendarStore();
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    const success = await connect('dev-auth-code');
    setConnecting(false);
    if (success) {
      Alert.alert('Connected', 'Calendar connected successfully.', [
        { text: 'Continue', onPress: () => navigation.navigate('Home') },
      ]);
    }
  };

  const handleSkip = () => {
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn delay={0}>
          <View style={s.iconWrap}>
            <Text style={s.icon}>{'📅'}</Text>
          </View>
          <Text style={s.heading}>Connect Your Calendar</Text>
          <Text style={s.subtitle}>
            Let your AI assistant check your availability and book appointments on
            your behalf during phone calls.
          </Text>
        </FadeIn>

        <FadeIn delay={80}>
          <Card>
            <View style={s.benefitRow}>
              <Text style={s.checkmark}>{'✓'}</Text>
              <Text style={s.benefitText}>
                Real-time availability during calls
              </Text>
            </View>
            <View style={s.benefitRow}>
              <Text style={s.checkmark}>{'✓'}</Text>
              <Text style={s.benefitText}>
                Automatic appointment booking
              </Text>
            </View>
            <View style={s.benefitRow}>
              <Text style={s.checkmark}>{'✓'}</Text>
              <Text style={s.benefitText}>
                Calendar events sync to your phone
              </Text>
            </View>
          </Card>
        </FadeIn>

        <FadeIn delay={160}>
          <Button
            title="Connect Google Calendar"
            onPress={handleConnect}
            loading={connecting || loading}
            style={s.connectBtn}
          />
          <Button
            title="Skip for Now"
            onPress={handleSkip}
            variant="ghost"
            style={s.skipBtn}
          />
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, spacing, typography } = theme;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
    iconWrap: { alignItems: 'center', marginBottom: spacing.lg },
    icon: { fontSize: 56 },
    heading: {
      ...typography.h1,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    benefitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    checkmark: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.success,
    },
    benefitText: { ...typography.body, color: colors.textPrimary, flex: 1 },
    connectBtn: { marginTop: spacing.xl },
    skipBtn: { marginTop: spacing.md },
  });
}
