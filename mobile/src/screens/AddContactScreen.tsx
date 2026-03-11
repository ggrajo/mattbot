import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { apiClient } from '../api/client';

const CATEGORIES = ['Personal', 'Business', 'Medical', 'Legal', 'Financial', 'Other'];

export function AddContactScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/contacts', {
        display_name: name.trim(),
        phone_number: phone.trim() || undefined,
        email: email.trim() || undefined,
        category: category || undefined,
        notes: notes.trim() || undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error?.message || 'Failed to create contact');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Icon name="close" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ ...typography.h3, color: colors.textPrimary, marginLeft: spacing.md, flex: 1 }}>
          Add Contact
        </Text>
        <Pressable
          onPress={handleSave}
          disabled={saving || !name.trim()}
          style={{
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            backgroundColor: !name.trim() ? colors.textDisabled : colors.primary,
            borderRadius: radii.full,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text style={{ ...typography.button, color: colors.onPrimary, fontSize: 14 }}>Save</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <FadeIn delay={0}>
            <FieldInput label="Name *" value={name} onChangeText={setName} placeholder="Contact name" colors={colors} spacing={spacing} typography={typography} radii={radii} />
          </FadeIn>
          <FadeIn delay={30}>
            <FieldInput label="Phone" value={phone} onChangeText={setPhone} placeholder="Phone number" colors={colors} spacing={spacing} typography={typography} radii={radii} keyboardType="phone-pad" />
          </FadeIn>
          <FadeIn delay={60}>
            <FieldInput label="Email" value={email} onChangeText={setEmail} placeholder="Email address" colors={colors} spacing={spacing} typography={typography} radii={radii} keyboardType="email-address" />
          </FadeIn>

          <FadeIn delay={90}>
            <Text style={{ ...typography.caption, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.sm }}>
              CATEGORY
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.toLowerCase();
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setCategory(isSelected ? '' : cat.toLowerCase())}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderRadius: radii.full,
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderWidth: 1,
                      borderColor: isSelected ? colors.primary : colors.border,
                    }}
                  >
                    <Text
                      style={{
                        ...typography.caption,
                        fontWeight: '600',
                        color: isSelected ? colors.onPrimary : colors.textPrimary,
                      }}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </FadeIn>

          <FadeIn delay={120}>
            <Text style={{ ...typography.caption, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.xl, marginBottom: spacing.xs }}>
              NOTES
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes..."
              placeholderTextColor={colors.textDisabled}
              multiline
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.md,
                minHeight: 100,
                ...typography.body,
                color: colors.textPrimary,
                textAlignVertical: 'top',
              }}
            />
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function FieldInput({
  label,
  value,
  onChangeText,
  placeholder,
  colors,
  spacing,
  typography,
  radii,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  colors: any;
  spacing: any;
  typography: any;
  radii: any;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
}) {
  return (
    <View style={{ marginTop: spacing.lg }}>
      <Text style={{ ...typography.caption, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs }}>
        {label.toUpperCase()}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDisabled}
        keyboardType={keyboardType}
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.md,
          ...typography.body,
          color: colors.textPrimary,
        }}
      />
    </View>
  );
}
