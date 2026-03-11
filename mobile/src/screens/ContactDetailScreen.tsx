import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { apiClient } from '../api/client';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ContactDetail'>;

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

function categoryLabel(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label || slug;
}

export function ContactDetailScreen({ route }: Props) {
  const { contactId } = route.params;
  const { colors, spacing, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('other');
  const [notes, setNotes] = useState('');

  async function load() {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get(`/contacts/${contactId}`);
      setContact(res);
      setName(res.display_name || '');
      setPhone(res.phone_last4 || '');
      setEmail(res.email || '');
      setCategory(res.category || 'other');
      setNotes(res.notes || '');
      setError(undefined);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.error?.message || 'Failed to load contact');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  async function handleSave() {
    setSaving(true);
    try {
      await apiClient.patch(`/contacts/${contactId}`, {
        display_name: name.trim(),
        email: email.trim() || undefined,
        category,
        notes: notes.trim() || undefined,
      });
      setEditing(false);
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || e?.response?.data?.error?.message || 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert('Delete Contact', 'Are you sure you want to delete this contact?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/contacts/${contactId}`);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.detail || e?.response?.data?.error?.message || 'Failed to delete contact');
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !contact) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <Icon name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={{ fontSize: 16, color: colors.error, marginTop: spacing.md, textAlign: 'center' }}>
          {error || 'Contact not found'}
        </Text>
        <Pressable onPress={load} style={{ marginTop: spacing.md }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const viewFields: { label: string; value: string; key: string }[] = [
    { label: 'Name', value: name, key: 'name' },
    { label: 'Phone (last 4)', value: phone, key: 'phone' },
    { label: 'Email', value: email, key: 'email' },
    { label: 'Category', value: categoryLabel(category), key: 'category' },
    { label: 'Notes', value: notes, key: 'notes' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Icon name="arrow-left" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ ...typography.h3, color: colors.textPrimary, marginLeft: spacing.md, flex: 1 }}>
          Contact
        </Text>
        {!editing ? (
          <Pressable onPress={() => setEditing(true)}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}>Edit</Text>
          </Pressable>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={() => { setEditing(false); load(); }} style={{ marginRight: spacing.md }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textSecondary }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={{
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm,
                backgroundColor: colors.primary,
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
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <FadeIn delay={0}>
          <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: colors.primary + '18',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.md,
              }}
            >
              <Text style={{ fontSize: 28, fontWeight: '700', color: colors.primary }}>
                {(name || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            {!editing && (
              <Text style={{ ...typography.h2, color: colors.textPrimary }}>{name || 'Unknown'}</Text>
            )}
          </View>
        </FadeIn>

        {!editing ? (
          /* View mode */
          <FadeIn delay={40}>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.xl,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: 'hidden',
              }}
            >
              {viewFields.map((field, idx) => (
                <View
                  key={field.key}
                  style={{
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.lg,
                    borderBottomWidth: idx < viewFields.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs }}>
                    {field.label}
                  </Text>
                  <Text style={{ fontSize: 16, color: field.value ? colors.textPrimary : colors.textDisabled }}>
                    {field.value || 'Not set'}
                  </Text>
                </View>
              ))}
            </View>
          </FadeIn>
        ) : (
          /* Edit mode */
          <FadeIn delay={40}>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.xl,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: 'hidden',
                padding: spacing.lg,
              }}
            >
              {/* Name */}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs }}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Contact name"
                placeholderTextColor={colors.textDisabled}
                style={{
                  fontSize: 16,
                  color: colors.textPrimary,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  paddingBottom: spacing.sm,
                  marginBottom: spacing.lg,
                }}
              />

              {/* Phone (read-only) */}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs }}>Phone (last 4)</Text>
              <Text style={{ fontSize: 16, color: colors.textDisabled, marginBottom: spacing.lg }}>
                {phone || 'Not set'}
              </Text>

              {/* Email */}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs }}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor={colors.textDisabled}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{
                  fontSize: 16,
                  color: colors.textPrimary,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  paddingBottom: spacing.sm,
                  marginBottom: spacing.lg,
                }}
              />

              {/* Category (chip picker) */}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm }}>Category</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg }}>
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.slug;
                  return (
                    <Pressable
                      key={cat.slug}
                      onPress={() => setCategory(cat.slug)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                        backgroundColor: isSelected ? colors.primary : colors.background,
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

              {/* Notes */}
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs }}>Notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any notes..."
                placeholderTextColor={colors.textDisabled}
                multiline
                style={{
                  fontSize: 16,
                  color: colors.textPrimary,
                  minHeight: 60,
                  textAlignVertical: 'top',
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  paddingBottom: spacing.sm,
                }}
              />
            </View>
          </FadeIn>
        )}

        {/* Delete */}
        <FadeIn delay={80}>
          <Pressable
            onPress={handleDelete}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: spacing.xxl,
              paddingVertical: spacing.md,
              backgroundColor: colors.error + '12',
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.error + '25',
            }}
          >
            <Icon name="delete-outline" size={20} color={colors.error} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.error, marginLeft: spacing.sm }}>Delete Contact</Text>
          </Pressable>
        </FadeIn>
      </ScrollView>
    </View>
  );
}
