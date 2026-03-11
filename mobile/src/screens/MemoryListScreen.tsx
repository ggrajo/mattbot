import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import type { Theme } from '../theme/tokens';
import { memoryApi } from '../api/memory';
import type { MemoryItem } from '../api/memory';

const MEMORY_TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  fact: { bg: '#E3F2FD', fg: '#1565C0' },
  preference: { bg: '#F3E5F5', fg: '#7B1FA2' },
  action: { bg: '#FFF3E0', fg: '#E65100' },
  note: { bg: '#E8F5E9', fg: '#2E7D32' },
};

export function MemoryListScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const callerPhoneHash = (route.params as { callerPhoneHash?: string } | undefined)?.callerPhoneHash;

  const [items, setItems] = useState<MemoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const fetchMemories = useCallback(async () => {
    try {
      let response;
      if (callerPhoneHash) {
        response = await memoryApi.getCallerMemories(callerPhoneHash);
      } else {
        response = await memoryApi.listMemories({ limit: 100 });
      }
      setItems(response.data.items);
      setTotal(response.data.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [callerPhoneHash]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setSearchQuery('');
    fetchMemories();
  }, [fetchMemories]);

  const onSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      fetchMemories();
      return;
    }
    setSearching(true);
    try {
      const { data } = await memoryApi.searchMemories(query.trim());
      setItems(data.items);
      setTotal(data.total);
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }, [fetchMemories]);

  const grouped = items.reduce<Record<string, MemoryItem[]>>((acc, item) => {
    const key = item.caller_phone_hash || 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const renderItem = ({ item }: { item: MemoryItem }) => {
    const typeColor = MEMORY_TYPE_COLORS[item.memory_type] ?? { bg: '#ECEFF1', fg: '#546E7A' };

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => {
          if (item.caller_phone_hash) {
            navigation.navigate('CallerProfile', {
              phoneHash: item.caller_phone_hash,
              callerName: item.caller_name,
            });
          }
        }}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor.bg }]}>
            <Text style={[styles.typeBadgeText, { color: typeColor.fg }]}>
              {item.memory_type}
            </Text>
          </View>
          {item.caller_name && (
            <Text style={styles.callerTag}>{item.caller_name}</Text>
          )}
        </View>
        <Text style={styles.content}>{item.content}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.meta}>
            {item.source} &middot; {new Date(item.created_at).toLocaleDateString()}
          </Text>
          {item.importance > 1 && (
            <Text style={styles.importanceBadge}>importance: {item.importance}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FadeIn delay={0}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {callerPhoneHash ? 'Caller Memories' : 'All Memories'}
          </Text>
          {total > 0 && <Text style={styles.subtitle}>{total} total</Text>}
        </View>
      </FadeIn>

      <FadeIn delay={40}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search memories..."
            placeholderTextColor={theme.colors.textDisabled}
            value={searchQuery}
            onChangeText={onSearch}
          />
          {searching && <ActivityIndicator size="small" color={theme.colors.primary} />}
        </View>
      </FadeIn>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No memories found.</Text>
            </View>
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
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.sm,
    },
    title: { ...typography.h1, color: colors.textPrimary },
    subtitle: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xs },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    searchInput: {
      ...typography.body,
      color: colors.textPrimary,
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
    },
    loader: { marginTop: spacing.xxl },
    list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      padding: spacing.xl,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.card,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    typeBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.full,
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    callerTag: {
      ...typography.caption,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    content: { ...typography.body, color: colors.textPrimary },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
      paddingTop: spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    meta: { ...typography.caption, color: colors.textSecondary },
    importanceBadge: {
      ...typography.caption,
      color: colors.primary,
      fontWeight: '600',
    },
    emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
    emptyText: { ...typography.body, color: colors.textDisabled },
  });
}
