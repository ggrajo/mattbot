import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useTelephonyStore } from '../store/telephonyStore';
import type { Theme } from '../theme/tokens';

type Mode = 'dedicated' | 'forwarding';

export function CallModesScreen({ navigation }: any) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const {
    callMode,
    loading,
    error,
    fetchCallMode,
    updateCallMode,
  } = useTelephonyStore();

  const [selectedMode, setSelectedMode] = useState<Mode>('dedicated');
  const [forwardingNumber, setForwardingNumber] = useState('');

  useEffect(() => {
    fetchCallMode();
  }, [fetchCallMode]);

  useEffect(() => {
    if (callMode) {
      setSelectedMode(callMode.mode === 'forwarding' ? 'forwarding' : 'dedicated');
      setForwardingNumber(callMode.forwarding_number ?? '');
    }
  }, [callMode]);

  async function handleSave() {
    if (selectedMode === 'forwarding' && !forwardingNumber.trim()) {
      Alert.alert('Error', 'Please enter a forwarding number.');
      return;
    }
    try {
      await updateCallMode(
        selectedMode,
        selectedMode === 'forwarding' ? forwardingNumber.trim() : undefined,
      );
      Alert.alert('Saved', 'Call mode updated successfully.');
    } catch {
      Alert.alert('Error', 'Failed to update call mode.');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Call Modes</Text>
        <Text style={styles.subtitle}>
          Choose how callers reach your AI assistant
        </Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading && !callMode && (
          <ActivityIndicator
            size="large"
            color={theme.colors.primary}
            style={styles.loader}
          />
        )}

        <TouchableOpacity
          style={[
            styles.modeCard,
            selectedMode === 'dedicated' && styles.modeCardSelected,
          ]}
          onPress={() => setSelectedMode('dedicated')}
          activeOpacity={0.7}
        >
          <View style={styles.modeHeader}>
            <View
              style={[
                styles.radio,
                selectedMode === 'dedicated' && styles.radioSelected,
              ]}
            >
              {selectedMode === 'dedicated' && (
                <View style={styles.radioInner} />
              )}
            </View>
            <View style={styles.modeHeaderText}>
              <Text style={styles.modeName}>Mode A — Dedicated Number</Text>
              <Text style={styles.modeDescription}>
                Callers dial your AI number directly. Best for a separate AI
                line.
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeCard,
            selectedMode === 'forwarding' && styles.modeCardSelected,
          ]}
          onPress={() => setSelectedMode('forwarding')}
          activeOpacity={0.7}
        >
          <View style={styles.modeHeader}>
            <View
              style={[
                styles.radio,
                selectedMode === 'forwarding' && styles.radioSelected,
              ]}
            >
              {selectedMode === 'forwarding' && (
                <View style={styles.radioInner} />
              )}
            </View>
            <View style={styles.modeHeaderText}>
              <Text style={styles.modeName}>Mode B — Call Forwarding</Text>
              <Text style={styles.modeDescription}>
                Forward unanswered calls from your personal number to the AI.
                Requires carrier setup.
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {selectedMode === 'forwarding' && (
          <View style={styles.forwardingSection}>
            <Text style={styles.inputLabel}>Your Personal Number</Text>
            <TextInput
              style={styles.input}
              value={forwardingNumber}
              onChangeText={setForwardingNumber}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor={theme.colors.textDisabled}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            {callMode?.forwarding_verified ? (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedIcon}>{'✓'}</Text>
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            ) : (
              <View style={styles.unverifiedBadge}>
                <Text style={styles.unverifiedText}>Not Verified</Text>
              </View>
            )}

            <View style={styles.linkRow}>
              <TouchableOpacity
                onPress={() => navigation.navigate('ForwardingSetupGuide')}
                activeOpacity={0.7}
              >
                <Text style={styles.linkText}>Setup Guide</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('ForwardingVerify')}
                activeOpacity={0.7}
              >
                <Text style={styles.linkText}>Verify Forwarding</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.onPrimary} />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
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
      marginVertical: spacing.xl,
    },
    modeCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.xl,
      marginBottom: spacing.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      ...shadows.card,
    },
    modeCardSelected: {
      borderColor: colors.primary,
      borderWidth: 2,
    },
    modeHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
      marginTop: 2,
    },
    radioSelected: {
      borderColor: colors.primary,
    },
    radioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    modeHeaderText: {
      flex: 1,
    },
    modeName: {
      ...typography.h3,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    modeDescription: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    forwardingSection: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.xl,
      marginBottom: spacing.lg,
      ...shadows.card,
    },
    inputLabel: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      fontWeight: '600',
      marginBottom: spacing.sm,
    },
    input: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: radii.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      ...typography.body,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.md,
    },
    verifiedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.successContainer,
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.full,
      marginBottom: spacing.md,
    },
    verifiedIcon: {
      color: colors.success,
      fontWeight: '700',
      marginRight: spacing.xs,
    },
    verifiedText: {
      ...typography.caption,
      color: colors.success,
      fontWeight: '700',
    },
    unverifiedBadge: {
      backgroundColor: colors.warningContainer,
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.full,
      marginBottom: spacing.md,
    },
    unverifiedText: {
      ...typography.caption,
      color: colors.warning,
      fontWeight: '600',
    },
    linkRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    linkText: {
      ...typography.bodySmall,
      color: colors.primary,
      fontWeight: '600',
    },
    saveButton: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
      alignItems: 'center',
      minHeight: 48,
      justifyContent: 'center',
    },
    saveButtonText: {
      ...typography.button,
      color: colors.onPrimary,
    },
  });
}
