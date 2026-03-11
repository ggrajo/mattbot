import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { PhoneInput } from '../components/ui/PhoneInput';
import { ContactPicker } from '../components/ui/ContactPicker';
import { apiClient, extractApiError } from '../api/client';

interface VipEntry {
  id: string;
  phone_last4: string;
  display_name?: string | null;
  company?: string | null;
  relationship?: string | null;
  email?: string | null;
  notes?: string | null;
  created_at: string;
}

export function VipListScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<VipEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [showInput, setShowInput] = useState(false);

  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newRelationship, setNewRelationship] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await apiClient.get('/vip');
      setItems(data.items ?? data ?? []);
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems]),
  );

  function resetForm() {
    setNewPhone('');
    setNewName('');
    setNewCompany('');
    setNewRelationship('');
    setNewNotes('');
  }

  async function handleAdd() {
    const phone = newPhone.trim();
    if (!phone) return;
    try {
      setAdding(true);
      const payload: Record<string, string> = { phone_number: phone };
      if (newName.trim()) payload.display_name = newName.trim();
      if (newCompany.trim()) payload.company = newCompany.trim();
      if (newRelationship.trim()) payload.relationship = newRelationship.trim();
      if (newNotes.trim()) payload.notes = newNotes.trim();
      await apiClient.post('/vip', payload);
      resetForm();
      setShowInput(false);
      await loadItems();
    } catch (e) {
      Alert.alert('Error', extractApiError(e));
    } finally {
      setAdding(false);
    }
  }

  function handleRemove(item: VipEntry) {
    Alert.alert(
      'Remove VIP',
      `Remove ${item.display_name || '····' + item.phone_last4} from VIP list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/vip/${item.id}`);
              await loadItems();
            } catch (e) {
              Alert.alert('Error', extractApiError(e));
            }
          },
        },
      ],
    );
  }

  function renderItem({ item, index }: { item: VipEntry; index: number }) {
    const date = new Date(item.created_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return (
      <FadeIn delay={index * 40} slide="up">
        <View
          style={{
            backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
            borderRadius: radii.lg,
            padding: spacing.lg,
            marginBottom: spacing.sm,
            borderWidth: 1,
            borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radii.full,
              backgroundColor: colors.primaryContainer,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="star" size="md" color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
          <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}>
            {item.display_name || '····' + item.phone_last4}
          </Text>
          {item.display_name && (
            <Text style={{ ...typography.caption, color: colors.textSecondary }}>····{item.phone_last4}</Text>
          )}
            <Text style={{ ...typography.caption, color: colors.textDisabled, marginTop: 2 }}>
              Added {date}
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleRemove(item)} hitSlop={8}>
            <Icon name="close-circle-outline" size="lg" color={colors.error} />
          </TouchableOpacity>
        </View>
      </FadeIn>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + spacing.lg,
        paddingHorizontal: spacing.lg,
      }}
    >
      <FadeIn delay={0} slide="up">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }}>
          <Icon name="star-outline" size="lg" color={colors.primary} />
          <Text style={{ ...typography.h2, color: colors.textPrimary, flex: 1 }}>VIP List</Text>
          <TouchableOpacity onPress={() => setShowInput(!showInput)} hitSlop={8}>
            <Icon name={showInput ? 'close' : 'plus-circle-outline'} size="lg" color={colors.primary} />
          </TouchableOpacity>
        </View>
      </FadeIn>

      {showInput && (
        <FadeIn delay={0} slide="up">
          <View
            style={{
              marginBottom: spacing.md,
              backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
              borderRadius: radii.lg,
              padding: spacing.lg,
              borderWidth: 1,
              borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
              gap: spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
              <ContactPicker
                onSelect={(phone, name) => {
                  setNewPhone(phone);
                  if (name) setNewName(name);
                }}
                buttonLabel="From Contacts"
              />
            </View>
            <PhoneInput
              value={newPhone}
              onChangeValue={setNewPhone}
              label="Phone Number"
              placeholder="(555) 123-4567"
            />
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Display Name (optional)"
              placeholderTextColor={colors.textDisabled}
              style={{
                ...typography.body,
                color: colors.textPrimary,
                backgroundColor: colors.surface,
                borderRadius: radii.md,
                padding: spacing.md,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            />
            <TextInput
              value={newCompany}
              onChangeText={setNewCompany}
              placeholder="Company (optional)"
              placeholderTextColor={colors.textDisabled}
              style={{
                ...typography.body,
                color: colors.textPrimary,
                backgroundColor: colors.surface,
                borderRadius: radii.md,
                padding: spacing.md,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            />
            <TextInput
              value={newRelationship}
              onChangeText={setNewRelationship}
              placeholder="Relationship (optional)"
              placeholderTextColor={colors.textDisabled}
              style={{
                ...typography.body,
                color: colors.textPrimary,
                backgroundColor: colors.surface,
                borderRadius: radii.md,
                padding: spacing.md,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            />
            <TextInput
              value={newNotes}
              onChangeText={setNewNotes}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.textDisabled}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
              style={{
                ...typography.body,
                color: colors.textPrimary,
                backgroundColor: colors.surface,
                borderRadius: radii.md,
                padding: spacing.md,
                borderWidth: 1,
                borderColor: colors.border,
                minHeight: 60,
              }}
            />
            <TouchableOpacity
              onPress={handleAdd}
              disabled={adding || !newPhone.trim()}
              style={{
                backgroundColor: colors.primary,
                borderRadius: radii.md,
                paddingVertical: spacing.md,
                alignItems: 'center',
                opacity: adding || !newPhone.trim() ? 0.5 : 1,
                marginTop: spacing.xs,
              }}
              activeOpacity={0.8}
            >
              {adding ? (
                <ActivityIndicator color={colors.onPrimary} size="small" />
              ) : (
                <Text style={{ ...typography.button, color: colors.onPrimary }}>Add to VIP</Text>
              )}
            </TouchableOpacity>
          </View>
        </FadeIn>
      )}

      {error && (
        <View
          style={{
            backgroundColor: colors.errorContainer,
            borderRadius: radii.md,
            padding: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            marginBottom: spacing.md,
          }}
        >
          <Icon name="alert-circle-outline" size="md" color={colors.error} />
          <Text style={{ ...typography.bodySmall, color: colors.error, flex: 1 }}>{error}</Text>
        </View>
      )}

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={loadItems}
        contentContainerStyle={
          items.length === 0
            ? { flex: 1, justifyContent: 'center', alignItems: 'center' }
            : { paddingBottom: insets.bottom + spacing.xxl }
        }
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: 'center', paddingHorizontal: spacing.xl }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: radii.xxl,
                  backgroundColor: colors.primaryContainer,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing.lg,
                }}
              >
                <Icon name="star-off-outline" size={32} color={colors.primary} />
              </View>
              <Text
                style={{ ...typography.h3, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xs }}
              >
                No VIP contacts
              </Text>
              <Text
                style={{ ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center' }}
              >
                VIP contacts will always be put through to you
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
