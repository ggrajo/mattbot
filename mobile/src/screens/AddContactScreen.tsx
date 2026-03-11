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
import { TextInput } from '../components/ui/TextInput';
import { Button } from '../components/ui/Button';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { apiClient } from '../api/client';

export function AddContactScreen() {
  const theme = useTheme();
  const { colors, spacing, typography } = theme;
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Missing Info', 'Please enter both a name and phone number.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/contacts', { name: name.trim(), phone: phone.trim(), notes: notes.trim() });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not save contact. Please try again.');
    }
    setSaving(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FadeIn delay={0}>
          <Text style={[typography.h1, { color: colors.textPrimary, marginBottom: spacing.xl }]}>
            Add Contact
          </Text>
        </FadeIn>

        <FadeIn delay={60}>
          <TextInput
            label="Name"
            placeholder="Contact name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </FadeIn>

        <FadeIn delay={120}>
          <TextInput
            label="Phone Number"
            placeholder="+1 (555) 000-0000"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </FadeIn>

        <FadeIn delay={180}>
          <TextInput
            label="Notes"
            placeholder="Optional notes about this contact..."
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </FadeIn>

        <FadeIn delay={240}>
          <Button
            title="Save Contact"
            onPress={handleSave}
            loading={saving}
            disabled={!name.trim() || !phone.trim()}
          />
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}
