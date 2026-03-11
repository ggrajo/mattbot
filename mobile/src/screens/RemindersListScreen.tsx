import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
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
import { apiClient, extractApiError } from '../api/client';

type FilterTab = 'upcoming' | 'completed' | 'overdue';

interface Reminder {
  id: string;
  title: string;
  due_at: string;
  status: 'pending' | 'completed' | 'overdue' | 'cancelled';
  call_id?: string | null;
  timezone_at_creation?: string | null;
  created_at?: string;
  call_from_masked?: string | null;
}

const TABS: { key: FilterTab; label: string; icon: string }[] = [
  { key: 'upcoming', label: 'Upcoming', icon: 'clock-outline' },
  { key: 'completed', label: 'Completed', icon: 'check-circle-outline' },
  { key: 'overdue', label: 'Overdue', icon: 'alert-circle-outline' },
];

function statusMeta(status: string, colors: any): { icon: string; color: string; label: string } {
  switch (status) {
    case 'completed':
      return { icon: 'check-circle', color: colors.success, label: 'Completed' };
    case 'overdue':
      return { icon: 'alert-circle', color: colors.warning, label: 'Overdue' };
    case 'cancelled':
      return { icon: 'close-circle', color: colors.textDisabled, label: 'Cancelled' };
    default:
      return { icon: 'clock-outline', color: colors.primary, label: 'Pending' };
  }
}

export function RemindersListScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('upcoming');

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await apiClient.get('/reminders');
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

  const filtered = useMemo(() => {
    switch (activeTab) {
      case 'upcoming':
        return items.filter((r) => r.status === 'pending');
      case 'completed':
        return items.filter((r) => r.status === 'completed');
      case 'overdue':
        return items.filter((r) => r.status === 'overdue');
      default:
        return items;
    }
  }, [items, activeTab]);

  async function handleComplete(item: Reminder) {
    try {
      setActionId(item.id);
      await apiClient.post(`/reminders/${item.id}/complete`);
      await loadItems();
    } catch (e) {
      Alert.alert('Error', extractApiError(e));
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(item: Reminder) {
    Alert.alert('Delete Reminder', `Delete "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setActionId(item.id);
            await apiClient.delete(`/reminders/${item.id}`);
            await loadItems();
          } catch (e) {
            Alert.alert('Error', extractApiError(e));
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
  }

  function renderItem({ item }: { item: Reminder }) {
    const meta = statusMeta(item.status, colors);
    const dueDate = new Date(item.due_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const isOverdue = item.status === 'overdue';
    const isActioning = actionId === item.id;

    return (
      <View
        style={{
          backgroundColor: isOverdue ? colors.warningContainer : (theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF'),
          borderRadius: radii.lg,
          padding: spacing.lg,
          marginBottom: spacing.sm,
          borderWidth: 1,
          borderColor: isOverdue ? colors.warning : (theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
          <Icon name={meta.icon} size="lg" color={meta.color} />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                ...typography.body,
                color: colors.textPrimary,
                fontWeight: '600',
                textDecorationLine: item.status === 'completed' ? 'line-through' : 'none',
              }}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs }}>
              <Icon name="calendar-clock" size="sm" color={colors.textSecondary} />
              <Text style={{ ...typography.caption, color: colors.textSecondary }}>{dueDate}</Text>
            </View>
            <View
              style={{
                backgroundColor: meta.color + '20',
                borderRadius: radii.full,
                paddingHorizontal: spacing.sm,
                paddingVertical: 2,
                alignSelf: 'flex-start',
                marginTop: spacing.sm,
              }}
            >
              <Text style={{ ...typography.caption, color: meta.color, fontWeight: '600' }}>
                {meta.label}
              </Text>
            </View>
          </View>
        </View>

        {item.status === 'pending' || item.status === 'overdue' ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
            {isActioning ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => handleComplete(item)}
                  style={{
                    flex: 1,
                    backgroundColor: colors.success,
                    borderRadius: radii.md,
                    paddingVertical: spacing.sm,
                    alignItems: 'center',
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ ...typography.caption, color: '#FFFFFF', fontWeight: '700' }}>Complete</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  style={{
                    flex: 1,
                    backgroundColor: colors.errorContainer,
                    borderRadius: radii.md,
                    paddingVertical: spacing.sm,
                    alignItems: 'center',
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ ...typography.caption, color: colors.error, fontWeight: '700' }}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm }}>
            <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={8}>
              <Icon name="trash-can-outline" size="md" color={colors.textDisabled} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + spacing.lg,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg, paddingHorizontal: spacing.lg }}>
        <Icon name="bell-ring-outline" size="lg" color={colors.primary} />
        <Text style={{ ...typography.h2, color: colors.textPrimary, flex: 1 }}>Reminders</Text>
      </View>

      {/* Filter Tabs */}
      <FadeIn delay={0}>
        <View
          style={{
            flexDirection: 'row',
            marginHorizontal: spacing.lg,
            marginBottom: spacing.lg,
            gap: spacing.sm,
          }}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.7}
                onPress={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing.xs,
                  paddingVertical: spacing.sm + 2,
                  borderRadius: radii.full,
                  backgroundColor: active ? colors.primary : 'transparent',
                  borderWidth: active ? 0 : 1,
                  borderColor: colors.border,
                }}
              >
                <Icon name={tab.icon} size="sm" color={active ? colors.onPrimary : colors.textSecondary} />
                <Text
                  style={{
                    ...typography.caption,
                    fontWeight: '600',
                    color: active ? colors.onPrimary : colors.textSecondary,
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </FadeIn>

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
            marginHorizontal: spacing.lg,
          }}
        >
          <Icon name="alert-circle-outline" size="md" color={colors.error} />
          <Text style={{ ...typography.bodySmall, color: colors.error, flex: 1 }}>{error}</Text>
        </View>
      )}

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={loadItems}
        contentContainerStyle={
          filtered.length === 0
            ? { flex: 1, justifyContent: 'center', alignItems: 'center' }
            : { paddingBottom: insets.bottom + spacing.xxl, paddingHorizontal: spacing.lg }
        }
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: 'center', paddingHorizontal: spacing.xl }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: colors.surfaceVariant,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing.lg,
                }}
              >
                <Icon name="bell-off-outline" size={36} color={colors.textDisabled} />
              </View>
              <Text
                style={{
                  ...typography.h3,
                  color: colors.textSecondary,
                  textAlign: 'center',
                }}
              >
                No reminders
              </Text>
              <Text
                style={{
                  ...typography.bodySmall,
                  color: colors.textDisabled,
                  textAlign: 'center',
                  marginTop: spacing.sm,
                }}
              >
                Set a reminder from a call detail screen.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
