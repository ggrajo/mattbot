import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { apiClient } from '../api/client';

const CATEGORY_COLORS: Record<string, string> = {
  personal: '#6366F1',
  business: '#10B981',
  medical: '#EF4444',
  legal: '#F59E0B',
  financial: '#0EA5E9',
  spam: '#EF4444',
  unknown: '#6B7280',
};

export function ContactsListScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get('/contacts');
      setContacts(res.items ?? res.data ?? res ?? []);
      setError(undefined);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.display_name?.toLowerCase().includes(q) ||
        c.phone_last4?.includes(q) ||
        c.email?.toLowerCase().includes(q),
    );
  }, [contacts, search]);

  function renderItem({ item, index }: { item: any; index: number }) {
    const catColor = CATEGORY_COLORS[item.category?.toLowerCase()] || CATEGORY_COLORS.unknown;

    return (
      <FadeIn delay={index * 30} slide="up">
        <Pressable
          onPress={() => navigation.navigate('ContactDetail', { contactId: item.id })}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.lg,
            backgroundColor: pressed ? colors.surfaceVariant : 'transparent',
          })}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: radii.full,
              backgroundColor: colors.primaryContainer,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ ...typography.body, fontWeight: '700', color: colors.primary }}>
              {(item.display_name || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }} numberOfLines={1}>
              {item.display_name || 'Unknown'}
            </Text>
            {item.phone_last4 && (
              <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: 2 }}>
                ┬╖┬╖┬╖┬╖{item.phone_last4}
              </Text>
            )}
          </View>
          {item.category && (
            <View
              style={{
                backgroundColor: catColor + '20',
                borderRadius: radii.sm,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
                marginRight: spacing.sm,
              }}
            >
              <Text style={{ ...typography.caption, fontWeight: '700', color: catColor }}>
                {item.category}
              </Text>
            </View>
          )}
          <Icon name="chevron-right" size={20} color={colors.textSecondary} />
        </Pressable>
      </FadeIn>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.sm,
        }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Icon name="arrow-left" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ ...typography.h2, color: colors.textPrimary, marginLeft: spacing.md, flex: 1 }}>
          Contacts
        </Text>
        <Pressable
          onPress={() => navigation.navigate('AddContact')}
          hitSlop={12}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="plus" size={20} color={colors.onPrimary} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
            paddingHorizontal: spacing.md,
          }}
        >
          <Icon name="magnify" size={20} color={colors.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search contacts..."
            placeholderTextColor={colors.textDisabled}
            style={{
              flex: 1,
              paddingVertical: spacing.sm + 2,
              marginLeft: spacing.sm,
              ...typography.body,
              color: colors.textPrimary,
            }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Icon name="close-circle" size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
          <Icon name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={{ ...typography.body, color: colors.error, marginTop: spacing.md, textAlign: 'center' }}>
            {error}
          </Text>
          <Pressable onPress={load} style={{ marginTop: spacing.md }}>
            <Text style={{ ...typography.button, color: colors.primary }}>Retry</Text>
          </Pressable>
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
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
            <Icon name="account-group-outline" size={32} color={colors.primary} />
          </View>
          <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm }}>
            {search ? 'No results' : 'No contacts yet'}
          </Text>
          <Text style={{ ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center' }}>
            {search ? 'Try a different search term.' : 'Add your first contact to get started.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 70 }} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              progressBackgroundColor={colors.surface}
            />
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        />
      )}
    </View>
  );
}
