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
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');

  async function load() {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get(`/contacts/${contactId}`);
      setContact(res);
      setName(res.display_name || '');
      setPhone(res.phone_last4 || '');
      setEmail(res.email || '');
      setCategory(res.category || '');
      setNotes(res.notes || '');
      setError(undefined);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Failed to load contact');
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
        category: category.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setEditing(false);
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error?.message || 'Failed to save contact');
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
            Alert.alert('Error', e?.response?.data?.error?.message || 'Failed to delete contact');
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
        <Text style={{ ...typography.body, color: colors.error, marginTop: spacing.md, textAlign: 'center' }}>
          {error || 'Contact not found'}
        </Text>
        <Pressable onPress={load} style={{ marginTop: spacing.md }}>
          <Text style={{ ...typography.button, color: colors.primary }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const fields: { label: string; value: string; setter: (v: string) => void; key: string; readonly?: boolean }[] = [
    { label: 'Name', value: name, setter: setName, key: 'name' },
    { label: 'Phone (last 4)', value: phone, setter: setPhone, key: 'phone', readonly: true },
    { label: 'Email', value: email, setter: setEmail, key: 'email' },
    { label: 'Category', value: category, setter: setCategory, key: 'category' },
    { label: 'Notes', value: notes, setter: setNotes, key: 'notes' },
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
            <Text style={{ ...typography.button, color: colors.primary }}>Edit</Text>
          </Pressable>
        ) : (
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
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Text style={{ ...typography.button, color: colors.onPrimary, fontSize: 14 }}>Save</Text>
            )}
          </Pressable>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
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
            {fields.map((field, idx) => (
              <View
                key={field.key}
                style={{
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.lg,
                  borderBottomWidth: idx < fields.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}
              >
                <Text style={{ ...typography.caption, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.xs }}>
                  {field.label}
                </Text>
                {editing && !field.readonly ? (
                  <TextInput
                    value={field.value}
                    onChangeText={field.setter}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    placeholderTextColor={colors.textDisabled}
                    multiline={field.key === 'notes'}
                    style={{
                      ...typography.body,
                      color: colors.textPrimary,
                      padding: 0,
                      ...(field.key === 'notes' ? { minHeight: 60, textAlignVertical: 'top' as const } : {}),
                    }}
                  />
                ) : (
                  <Text style={{ ...typography.body, color: field.value ? colors.textPrimary : colors.textDisabled }}>
                    {field.value || 'Not set'}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </FadeIn>

        <FadeIn delay={80}>
          <Pressable
            onPress={handleDelete}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              marginTop: spacing.xxl,
              paddingVertical: spacing.md,
              backgroundColor: colors.error + '12',
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.error + '25',
            }}
          >
            <Icon name="delete-outline" size={20} color={colors.error} />
            <Text style={{ ...typography.button, color: colors.error }}>Delete Contact</Text>
          </Pressable>
        </FadeIn>
      </ScrollView>
    </View>
  );
}
