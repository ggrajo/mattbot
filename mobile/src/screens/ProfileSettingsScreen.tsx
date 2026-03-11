import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { TextInput } from '../components/ui/TextInput';
import { Button } from '../components/ui/Button';
import { FadeIn } from '../components/ui/FadeIn';
import { apiClient } from '../api/client';
import { extractApiError } from '../api/client';

interface MeResponse {
  display_name?: string | null;
  default_timezone?: string;
  language_code?: string;
  email?: string | null;
}

export function ProfileSettingsScreen() {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [nickname, setNickname] = useState('');
  const [company, setCompany] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const { data } = await apiClient.get<MeResponse>('/me');
      setDisplayName(data.display_name ?? '');
      setNickname('');
      setCompany('');
      setRoleTitle('');
      setTimezone(data.default_timezone ?? 'UTC');
      setLanguage(data.language_code ?? 'en');
    } catch (error) {
      Alert.alert('Error', extractApiError(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await apiClient.patch('/me', {
        display_name: displayName || null,
        default_timezone: timezone || 'UTC',
        language_code: language || 'en',
      });
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (error) {
      Alert.alert('Error', extractApiError(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FadeIn delay={0}>
            <Text style={[typography.h1, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
              Profile Settings
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.xl }]}>
              Manage your profile information.
            </Text>
          </FadeIn>

          <FadeIn delay={60}>
            <TextInput
              label="Display Name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              autoCapitalize="words"
            />
            <TextInput
              label="Nickname"
              value={nickname}
              onChangeText={setNickname}
              placeholder="Preferred nickname"
              autoCapitalize="words"
            />
            <TextInput
              label="Company"
              value={company}
              onChangeText={setCompany}
              placeholder="Company name"
              autoCapitalize="words"
            />
            <TextInput
              label="Role / Title"
              value={roleTitle}
              onChangeText={setRoleTitle}
              placeholder="Job title"
              autoCapitalize="words"
            />
            <TextInput
              label="Timezone"
              value={timezone}
              onChangeText={setTimezone}
              placeholder="e.g. America/New_York"
              autoCapitalize="none"
            />
            <TextInput
              label="Language"
              value={language}
              onChangeText={setLanguage}
              placeholder="e.g. en"
              autoCapitalize="none"
            />
          </FadeIn>

          <FadeIn delay={120}>
            <Button
              title="Save"
              onPress={handleSave}
              loading={saving}
              style={{ marginTop: spacing.lg }}
            />
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    padding: 24,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
