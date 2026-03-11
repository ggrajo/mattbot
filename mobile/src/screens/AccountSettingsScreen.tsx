import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { StepUpPrompt } from '../components/auth/StepUpPrompt';
import { deleteAccount } from '../api/auth';
import { apiClient, extractApiError } from '../api/client';
import { useAuthStore } from '../store/authStore';

export function AccountSettingsScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const navigation = useNavigation();
  const signOut = useAuthStore((s) => s.signOut);

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showStepUp, setShowStepUp] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError('');
      apiClient
        .get('/me')
        .then((res) => {
          if (!active) return;
          setEmail(res.data.email ?? '');
          setStatus(res.data.account_status ?? 'active');
        })
        .catch((err) => {
          if (active) setError(extractApiError(err));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => { active = false; };
    }, []),
  );

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This action is permanent. All your data will be deleted and cannot be recovered. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => setShowStepUp(true),
        },
      ],
    );
  }

  async function handleDeleteStepUpSuccess(stepUpToken: string) {
    setShowStepUp(false);
    setDeleting(true);
    try {
      await deleteAccount(stepUpToken);
      await signOut();
    } catch (err) {
      Alert.alert('Error', extractApiError(err));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
      {error ? (
        <View style={{ padding: spacing.lg }}>
          <Text style={{ ...typography.body, color: colors.error }}>{error}</Text>
        </View>
      ) : null}

      <View style={{ backgroundColor: colors.surface, marginTop: spacing.lg, marginHorizontal: spacing.lg, borderRadius: radii.md, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="account-circle" size="xl" color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.body, color: colors.textPrimary }}>{email}</Text>
            <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs, textTransform: 'capitalize' }}>{status}</Text>
          </View>
        </View>
      </View>

      <View style={{ marginTop: spacing.xl, marginHorizontal: spacing.lg, gap: spacing.md }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ChangePassword' as never)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: radii.md,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            gap: spacing.md,
          }}
        >
          <Icon name="lock-outline" size="md" color={colors.textSecondary} />
          <Text style={{ ...typography.body, color: colors.textPrimary, flex: 1 }}>Change Password</Text>
          <Icon name="chevron-right" size="md" color={colors.textDisabled} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('PinSetup' as never)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: radii.md,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            gap: spacing.md,
          }}
        >
          <Icon name="dialpad" size="md" color={colors.textSecondary} />
          <Text style={{ ...typography.body, color: colors.textPrimary, flex: 1 }}>PIN Setup</Text>
          <Icon name="chevron-right" size="md" color={colors.textDisabled} />
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: spacing.xxl, marginHorizontal: spacing.lg, gap: spacing.md }}>
        <TouchableOpacity
          onPress={handleSignOut}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radii.md,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            gap: spacing.sm,
          }}
        >
          <Icon name="logout" size="md" color={colors.textPrimary} />
          <Text style={{ ...typography.button, color: colors.textPrimary }}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDeleteAccount}
          disabled={deleting}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.errorContainer,
            borderRadius: radii.md,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            gap: spacing.sm,
            opacity: deleting ? 0.6 : 1,
          }}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <Icon name="delete-outline" size="md" color={colors.error} />
          )}
          <Text style={{ ...typography.button, color: colors.error }}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      <StepUpPrompt
        visible={showStepUp}
        onSuccess={handleDeleteStepUpSuccess}
        onCancel={() => setShowStepUp(false)}
        title="Verify to delete account"
        message="Enter your password to permanently delete your account."
      />
    </ScrollView>
  );
}
