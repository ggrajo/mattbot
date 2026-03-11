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
import { TextInput } from '../components/ui/TextInput';
import { Button } from '../components/ui/Button';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import type { Theme } from '../theme/tokens';

export function AccountSettingsScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const navigation = useNavigation<any>();
  const logout = useAuthStore((st) => st.logout);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    Alert.alert('Saved', 'Profile updated successfully.');
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Required', 'Please fill in both password fields.');
      return;
    }
    Alert.alert('Success', 'Password changed successfully.');
    setCurrentPassword('');
    setNewPassword('');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data will be erased.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            logout();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FadeIn delay={0}>
          <Text style={s.heading}>Account</Text>
          <Text style={s.subtitle}>Manage your profile and security settings.</Text>
        </FadeIn>

        <FadeIn delay={80}>
          <Card style={s.section}>
            <Text style={s.sectionTitle}>Profile</Text>
            <TextInput
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              autoCapitalize="words"
            />
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Button
              title="Save Profile"
              onPress={handleSaveProfile}
              loading={saving}
            />
          </Card>
        </FadeIn>

        <FadeIn delay={160}>
          <Card style={s.section}>
            <Text style={s.sectionTitle}>Change Password</Text>
            <TextInput
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              isPassword
            />
            <TextInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              isPassword
            />
            <Button
              title="Update Password"
              onPress={handleChangePassword}
              variant="outline"
            />
          </Card>
        </FadeIn>

        <FadeIn delay={240}>
          <Card style={s.section}>
            <Text style={s.sectionTitle}>Danger Zone</Text>
            <Text style={s.dangerText}>
              Deleting your account will permanently remove all data including call history, assistant settings, and subscriptions.
            </Text>
            <Button
              title="Delete Account"
              onPress={handleDeleteAccount}
              variant="destructive"
            />
          </Card>
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
    heading: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.sm },
    subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl },
    section: { marginBottom: spacing.lg },
    sectionTitle: {
      ...typography.h3,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    dangerText: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      marginBottom: spacing.md,
      lineHeight: 20,
    },
  });
}
