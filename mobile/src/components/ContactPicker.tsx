import React, { useCallback, useEffect, useState } from 'react';
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

export function ContactPicker({ visible, onClose, onSelect, title = 'Select Contact' }: ContactPickerProps) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const [callers, setCallers] = useState<CallerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchCallers = useCallback(async () => {
    try {
      const { data } = await memoryApi.listCallers({ limit: 100 });
      setCallers(data.callers);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      fetchCallers();
    }
  }, [visible, fetchCallers]);

  const filtered = search.trim()
    ? callers.filter(
        (c) =>
          c.caller_name?.toLowerCase().includes(search.toLowerCase()) ||
          c.phone_hash.includes(search),
      )
    : callers;

  const renderCaller = ({ item }: { item: CallerProfile }) => (
    <TouchableOpacity
      style={styles.callerRow}
      onPress={() => {
        onSelect(item);
        onClose();
      }}
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
          {item.memory_count} memories &middot; {item.call_count} calls
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
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
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.phone_hash}
            renderItem={renderCaller}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No known contacts found.</Text>
              </View>
            }
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
    },
    searchInput: {
      ...typography.body,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
    },
    loader: { marginTop: spacing.xxl },
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
    emptyText: { ...typography.body, color: colors.textDisabled },
  });
}
