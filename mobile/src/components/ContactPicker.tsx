import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  Platform,
  PermissionsAndroid,
  RefreshControl,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import type { Theme } from '../theme/tokens';
import { memoryApi } from '../api/memory';
import type { CallerProfile } from '../api/memory';

interface ContactPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (caller: CallerProfile) => void;
  title?: string;
}

type PickerState = 'loading' | 'ready' | 'error';

async function ensureContactsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
      {
        title: 'Contacts Permission',
        message: 'MattBot needs access to your contacts to identify callers.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

export function ContactPicker({
  visible,
  onClose,
  onSelect,
  title = 'Select Contact',
}: ContactPickerProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [callers, setCallers] = useState<CallerProfile[]>([]);
  const [state, setState] = useState<PickerState>('loading');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchCallers = useCallback(async () => {
    try {
      await ensureContactsPermission();
      const { data } = await memoryApi.listCallers({ limit: 200 });
      setCallers(data.callers);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setState('loading');
      setSearch('');
      fetchCallers();
    }
  }, [visible, fetchCallers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data } = await memoryApi.listCallers({ limit: 200 });
      setCallers(data.callers);
      setState('ready');
    } catch {
      setState('error');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return callers;
    return callers.filter(
      (c) =>
        c.caller_name?.toLowerCase().includes(q) ||
        c.phone_hash.includes(q),
    );
  }, [callers, search]);

  const handleSelect = useCallback(
    (caller: CallerProfile) => {
      onSelect(caller);
      onClose();
    },
    [onSelect, onClose],
  );

  const renderCaller = ({ item }: { item: CallerProfile }) => (
    <TouchableOpacity
      style={styles.callerRow}
      onPress={() => handleSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.callerAvatar}>
        <Text style={styles.callerAvatarText}>
          {(item.caller_name || '?')[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.callerInfo}>
        <Text style={styles.callerName}>
          {item.caller_name || `Caller ${item.phone_hash.slice(0, 8)}`}
        </Text>
        <Text style={styles.callerMeta}>
          {item.memory_count} memories · {item.call_count} calls
        </Text>
      </View>
    </TouchableOpacity>
  );

  const emptyComponent = (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>
        {search.trim()
          ? `No contacts matching "${search.trim()}"`
          : 'No known contacts yet. Contacts appear after calls.'}
      </Text>
      {search.trim() !== '' && (
        <TouchableOpacity
          style={styles.clearSearchBtn}
          onPress={() => setSearch('')}
        >
          <Text style={styles.clearSearchText}>Clear search</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.closeBtn}>Close</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor={theme.colors.textDisabled}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity
              style={styles.clearIcon}
              onPress={() => setSearch('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.clearIconText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {state === 'loading' ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading contacts...</Text>
          </View>
        ) : state === 'error' ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>Failed to load contacts</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                setState('loading');
                fetchCallers();
              }}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.phone_hash}
            renderItem={renderCaller}
            contentContainerStyle={styles.list}
            ListEmptyComponent={emptyComponent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
              />
            }
            keyboardShouldPersistTaps="handled"
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  const { colors, spacing, radii, typography } = theme;
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
    title: { ...typography.h2, color: colors.textPrimary },
    closeBtn: { ...typography.body, color: colors.primary, fontWeight: '600' },
    searchRow: {
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.md,
      position: 'relative' as const,
    },
    searchInput: {
      ...typography.body,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      paddingRight: spacing.xxl,
      backgroundColor: colors.surface,
    },
    clearIcon: {
      position: 'absolute' as const,
      right: spacing.xl + spacing.md,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
    },
    clearIconText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    loadingText: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.md,
    },
    errorText: {
      ...typography.body,
      color: colors.error || '#FF3B30',
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    retryBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
    },
    retryBtnText: {
      ...typography.body,
      color: '#FFFFFF',
      fontWeight: '600',
    },
    list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
    callerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    callerAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    callerAvatarText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
    callerInfo: { flex: 1 },
    callerName: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
    callerMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
    emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
    emptyText: { ...typography.body, color: colors.textDisabled, textAlign: 'center' },
    clearSearchBtn: {
      marginTop: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    clearSearchText: {
      ...typography.body,
      color: colors.primary,
      fontWeight: '600',
    },
  });
}
