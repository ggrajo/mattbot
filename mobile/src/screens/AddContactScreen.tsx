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
import { PhoneInput } from '../components/ui/PhoneInput';
import { apiClient } from '../api/client';

const CATEGORIES: { slug: string; label: string }[] = [
  { slug: 'friends', label: 'Friends' },
  { slug: 'family', label: 'Family' },
  { slug: 'business', label: 'Business' },
  { slug: 'clients', label: 'Clients' },
  { slug: 'colleagues', label: 'Colleagues' },
  { slug: 'healthcare', label: 'Healthcare' },
  { slug: 'vendors', label: 'Vendors' },
  { slug: 'acquaintances', label: 'Acquaintances' },
  { slug: 'other', label: 'Other' },
];

export function AddContactScreen() {
  const { colors, spacing, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [relationship, setRelationship] = useState('');
  const [category, setCategory] = useState('other');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Error', 'Phone number is required');
      return;
    }

    setSaving(true);
    try {
      await apiClient.post('/contacts', {
        phone_number: phone.trim(),
        display_name: name.trim(),
        email: email.trim() || undefined,
        company: company.trim() || undefined,
        relationship: relationship.trim() || undefined,
        category,
        notes: notes.trim() || undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || e?.response?.data?.error?.message || 'Failed to create contact');
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
          disabled={saving || !name.trim() || !phone.trim()}
          style={{
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.sm,
            backgroundColor: (!name.trim() || !phone.trim()) ? colors.textDisabled : colors.primary,
            borderRadius: radii.full,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>Save</Text>
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
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs }}>
              Name *
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Contact name"
              placeholderTextColor={colors.textDisabled}
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.md,
                fontSize: 16,
                color: colors.textPrimary,
              }}
            />
          </FadeIn>

          <FadeIn delay={30}>
            <View style={{ marginTop: spacing.lg }}>
              <PhoneInput
                value={phone}
                onChangeValue={setPhone}
                label="Phone Number *"
                placeholder="(555) 123-4567"
              />
            </View>
          </FadeIn>

          <FadeIn delay={60}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs }}>
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={colors.textDisabled}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.md,
                fontSize: 16,
                color: colors.textPrimary,
              }}
            />
          </FadeIn>

          <FadeIn delay={70}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.xs }}>
              Company
            </Text>
            <TextInput
              value={company}
              onChangeText={setCompany}
              placeholder="Company name"
              placeholderTextColor={colors.textDisabled}
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.md,
                fontSize: 16,
                color: colors.textPrimary,
              }}
            />
          </FadeIn>

          <FadeIn delay={80}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.xs }}>
              Relationship
            </Text>
            <TextInput
              value={relationship}
              onChangeText={setRelationship}
              placeholder="e.g., Client, Friend, Manager"
              placeholderTextColor={colors.textDisabled}
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.md,
                fontSize: 16,
                color: colors.textPrimary,
              }}
            />
          </FadeIn>

          <FadeIn delay={90}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.xl, marginBottom: spacing.sm }}>
              Category
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {CATEGORIES.map((cat, idx) => {
                const isSelected = category === cat.slug;
                return (
                  <Pressable
                    key={cat.slug}
                    onPress={() => setCategory(isSelected ? 'other' : cat.slug)}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderRadius: 20,
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderWidth: 1,
                      borderColor: isSelected ? colors.primary : colors.border,
                      marginRight: 8,
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: isSelected ? '#FFFFFF' : colors.textPrimary,
                      }}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </FadeIn>

          <FadeIn delay={120}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.xl, marginBottom: spacing.xs }}>
              Notes
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
                fontSize: 16,
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
