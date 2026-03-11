import React from 'react';
import { View, Text, SafeAreaView, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/ui/Button';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  const theme = useTheme();
  const { colors, spacing } = theme;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <View style={styles.topSpacer} />

        <FadeIn delay={0} duration={600}>
          <View style={styles.logoArea}>
            <View style={[styles.logoBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.logoText}>M</Text>
            </View>
            <Text style={[styles.brand, { color: colors.textPrimary }]} allowFontScaling>
              MattBot
            </Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]} allowFontScaling>
              Your AI-powered call assistant that screens, answers, and manages calls for you.
            </Text>
          </View>
        </FadeIn>

        <FadeIn delay={200} duration={600}>
          <View style={styles.features}>
            <FeatureRow emoji="🤖" label="AI call screening" colors={colors} />
            <FeatureRow emoji="📞" label="Smart call forwarding" colors={colors} />
            <FeatureRow emoji="📝" label="Automatic transcripts" colors={colors} />
          </View>
        </FadeIn>

        <View style={styles.bottomSpacer} />

        <FadeIn delay={400} duration={500}>
          <View style={[styles.buttonGroup, { gap: spacing.md }]}>
            <Button
              title="Get Started"
              onPress={() => navigation.navigate('Register')}
              variant="primary"
            />
            <Button
              title="I already have an account"
              onPress={() => navigation.navigate('Login')}
              variant="outline"
            />
          </View>
        </FadeIn>

        <View style={{ height: spacing.xl }} />
      </View>
    </SafeAreaView>
  );
}

function FeatureRow({ emoji, label, colors }: { emoji: string; label: string; colors: any }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <Text style={[styles.featureLabel, { color: colors.textPrimary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 32,
  },
  topSpacer: {
    flex: 1,
  },
  logoArea: {
    alignItems: 'center',
  },
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
  },
  brand: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  tagline: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  features: {
    marginTop: 32,
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureEmoji: {
    fontSize: 22,
  },
  featureLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  bottomSpacer: {
    flex: 1.2,
  },
  buttonGroup: {
    width: '100%',
  },
});
