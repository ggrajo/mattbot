import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TextInput } from '../components/ui/TextInput';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { apiClient } from '../api/client';
import type { Theme } from '../theme/tokens';

interface Contact {
  id: string;
  name: string;
  phone: string;
  is_vip: boolean;
  is_blocked: boolean;
  memory_count: number;
}

export function ContactsListScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const navigation = useNavigation<any>();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filtered, setFiltered] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<Contact[]>('/contacts');
      setContacts(data);
      setFiltered(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(contacts);
    } else {
      const q = search.toLowerCase();
      setFiltered(contacts.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)));
    }
  }, [search, contacts]);

  const renderContact = ({ item }: { item: Contact }) => (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('ContactDetail', { contactId: item.id })}
    >
      <View style={s.row}>
        <View style={[s.avatar, { backgroundColor: theme.colors.primary }]}>
          <Text style={s.avatarText}>{(item.name || '?')[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.nameRow}>
            <Text style={s.name}>{item.name}</Text>
            {item.is_vip && <Text style={s.badge}>VIP</Text>}
            {item.is_blocked && <Text style={[s.badge, s.blockedBadge]}>Blocked</Text>}
          </View>
          <Text style={s.phone}>{item.phone}</Text>
        </View>
        <Text style={s.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.safe}>
      <FadeIn delay={0}>
        <View style={s.header}>
          <Text style={s.title}>Contacts</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AddContact')}>
            <Text style={s.addBtn}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </FadeIn>

      <View style={{ paddingHorizontal: theme.spacing.xl }}>
        <TextInput
          label=""
          placeholder="Search contacts..."
          value={search}
          onChangeText={setSearch}
          containerStyle={{ marginBottom: theme.spacing.sm }}
        />
      </View>

      {loading && contacts.length === 0 ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderContact}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchContacts} />}
          ListEmptyComponent={
            <FadeIn delay={100}>
              <View style={s.empty}>
                <Text style={s.emptyEmoji}>👥</Text>
                <Text style={s.emptyText}>
                  {search ? 'No contacts match your search.' : 'No contacts yet. Add one to get started.'}
                </Text>
              </View>
            </FadeIn>
          }
        />
      )}
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, spacing, radii, typography, shadows } = theme;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.md,
    },
    title: { ...typography.h1, color: colors.textPrimary },
    addBtn: { ...typography.body, color: colors.primary, fontWeight: '600' },
    list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.lg,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.card,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    name: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
    phone: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
    badge: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.primary,
      backgroundColor: colors.primaryContainer,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      overflow: 'hidden',
    },
    blockedBadge: {
      color: colors.error,
      backgroundColor: colors.errorContainer,
    },
    chevron: { fontSize: 20, fontWeight: '600', color: colors.textDisabled },
    empty: { alignItems: 'center', paddingTop: 64 },
    emptyEmoji: { fontSize: 36, marginBottom: 12 },
    emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.xl },
  });
}
