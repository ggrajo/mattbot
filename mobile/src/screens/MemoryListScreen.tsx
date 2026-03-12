import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { Toast } from '../components/ui/Toast';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { ConfirmSheet } from '../components/ui/ConfirmSheet';
import { useTheme } from '../theme/ThemeProvider';
import { listMemoryItems, deleteMemoryItem, type MemoryItem } from '../api/memory';
import { extractApiError } from '../api/client';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'MemoryList'>;

export function MemoryListScreen({}: Props) {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;

  const [items, setItems] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MemoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listMemoryItems();
      setItems(result.items);
    } catch (e) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMemoryItem(deleteTarget.id);
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setDeleteTarget(null);
      setToast({ message: 'Memory deleted', type: 'success' });
    } catch (e) {
      setToast({ message: extractApiError(e), type: 'error' });
    } finally {
      setDeleting(false);
    }
  }

  function formatDate(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return iso;
    }
  }

  function memoryTypeIcon(type: string): string {
    switch (type) {
      case 'preference': return 'heart-outline';
      case 'contact': return 'account-outline';
      case 'fact': return 'lightbulb-outline';
      case 'instruction': return 'clipboard-text-outline';
      default: return 'brain';
    }
  }

  function memoryTypeColor(type: string): string {
    switch (type) {
      case 'preference': return colors.error;
      case 'contact': return colors.primary;
      case 'fact': return colors.warning;
      case 'instruction': return colors.accent;
      default: return colors.textSecondary;
    }
  }

  const renderItem = useCallback(({ item }: { item: MemoryItem }) => (
    <Card style={{ marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radii.md,
            backgroundColor: memoryTypeColor(item.memory_type) + '14',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={memoryTypeIcon(item.memory_type)} size="md" color={memoryTypeColor(item.memory_type)} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
                borderRadius: radii.full,
                backgroundColor: memoryTypeColor(item.memory_type) + '1A',
              }}
            >
              <Text
                style={{
                  ...typography.caption,
                  color: memoryTypeColor(item.memory_type),
                  fontWeight: '600',
                  textTransform: 'capitalize',
                }}
                allowFontScaling
              >
                {item.memory_type}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setDeleteTarget(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Delete memory"
              accessibilityRole="button"
            >
              <Icon name="delete-outline" size="md" color={colors.error} />
            </TouchableOpacity>
          </View>
          {item.subject && (
            <Text
              style={{ ...typography.body, color: colors.textPrimary, fontWeight: '500', marginTop: spacing.xs }}
              allowFontScaling
            >
              {item.subject}
            </Text>
          )}
          {item.value && (
            <Text
              style={{ ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xs, lineHeight: 20 }}
              allowFontScaling
              numberOfLines={3}
            >
              {item.value}
            </Text>
          )}
          <Text
            style={{ ...typography.caption, color: colors.textDisabled, marginTop: spacing.sm }}
            allowFontScaling
          >
            {formatDate(item.created_at)}
          </Text>
        </View>
      </View>
    </Card>
  ), [colors, spacing, typography, radii]);

  return (
    <ScreenWrapper scroll={false}>
      <Toast
        message={toast?.message ?? ''}
        type={toast?.type}
        visible={!!toast}
        onDismiss={() => setToast(null)}
      />

      <ConfirmSheet
        visible={!!deleteTarget}
        onDismiss={() => setDeleteTarget(null)}
        title="Delete Memory"
        message={`Are you sure you want to delete this memory${deleteTarget?.subject ? ` about "${deleteTarget.subject}"` : ''}? This cannot be undone.`}
        icon="delete-outline"
        destructive
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleting}
      />

      <Text
        style={{ ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg }}
        allowFontScaling
      >
        Memories
      </Text>

      {error && (
        <View style={{ marginBottom: spacing.lg }}>
          <ErrorMessage message={error} action="Retry" onAction={loadItems} />
        </View>
      )}

      {loading && items.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
          <Icon name="brain" size="xl" color={colors.textDisabled} />
          <Text style={{ ...typography.body, color: colors.textSecondary, textAlign: 'center' }} allowFontScaling>
            No memories yet. Your AI assistant will learn from calls and store key details here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          showsVerticalScrollIndicator={false}
          onRefresh={loadItems}
          refreshing={loading}
        />
      )}
    </ScreenWrapper>
  );
}
