import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { telephonyApi, ForwardingGuide } from '../api/telephony';
import { extractApiError } from '../api/client';
import type { Theme } from '../theme/tokens';

export function ForwardingSetupGuideScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [guide, setGuide] = useState<ForwardingGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await telephonyApi.getForwardingGuide();
        setGuide(data);
      } catch (err) {
        setError(extractApiError(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Forwarding Setup</Text>
        <Text style={styles.subtitle}>
          Follow these steps to forward unanswered calls to your AI assistant
        </Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading && (
          <ActivityIndicator
            size="large"
            color={theme.colors.primary}
            style={styles.loader}
          />
        )}

        {guide?.ai_number && (
          <View style={styles.aiNumberCard}>
            <Text style={styles.aiNumberLabel}>Forward calls to</Text>
            <Text style={styles.aiNumberValue}>{guide.ai_number}</Text>
          </View>
        )}

        {guide?.steps.map((step, index) => (
          <View key={index} style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          </View>
        ))}

        {!loading && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('ForwardingVerify')}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>Start Verification</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, spacing, radii, typography, shadows } = theme;
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      padding: spacing.xl,
      paddingBottom: spacing.xxxl,
    },
    title: {
      ...typography.h1,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginBottom: spacing.xl,
    },
    errorBox: {
      backgroundColor: colors.errorContainer,
      padding: spacing.md,
      borderRadius: radii.md,
      marginBottom: spacing.lg,
    },
    errorText: {
      ...typography.bodySmall,
      color: colors.error,
    },
    loader: {
      marginVertical: spacing.xxxl,
    },
    aiNumberCard: {
      backgroundColor: colors.primaryContainer,
      borderRadius: radii.lg,
      padding: spacing.xl,
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    aiNumberLabel: {
      ...typography.caption,
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: spacing.sm,
    },
    aiNumberValue: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 1,
    },
    stepCard: {
      flexDirection: 'row',
      marginBottom: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.lg,
      ...shadows.card,
    },
    stepNumber: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.lg,
      flexShrink: 0,
    },
    stepNumberText: {
      ...typography.bodySmall,
      color: colors.onPrimary,
      fontWeight: '700',
    },
    stepContent: {
      flex: 1,
      justifyContent: 'center',
    },
    stepText: {
      ...typography.body,
      color: colors.textPrimary,
      lineHeight: 22,
    },
    actions: {
      marginTop: spacing.xl,
      gap: spacing.md,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
    },
    primaryButtonText: {
      ...typography.button,
      color: colors.onPrimary,
    },
    secondaryButton: {
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    secondaryButtonText: {
      ...typography.button,
      color: colors.primary,
    },
  });
}
