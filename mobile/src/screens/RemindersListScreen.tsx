import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, Dimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Toast } from '../components/ui/Toast';
import { ConfirmSheet } from '../components/ui/ConfirmSheet';
import { useTheme } from '../theme/ThemeProvider';
import { useReminderStore } from '../store/reminderStore';
import { hapticLight } from '../utils/haptics';
import { RootStackParamList } from '../navigation/types';
import { fetchCallerPhone } from '../api/calls';
import type { Reminder } from '../api/reminders';

type Props = NativeStackScreenProps<RootStackParamList, 'RemindersList'>;

type TabKey = 'upcoming' | 'overdue' | 'completed';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'upcoming', label: 'Upcoming', icon: 'clock-outline' },
  { key: 'overdue', label: 'Overdue', icon: 'alert-circle-outline' },
  { key: 'completed', label: 'Done', icon: 'check-circle-outline' },
];

function classifyReminder(item: Reminder): TabKey {
  if (item.status === 'completed' || item.status === 'cancelled') return 'completed';
  const now = Date.now();
  const due = new Date(item.due_at).getTime();
  if (item.status === 'overdue' || (item.status === 'pending' && due < now)) return 'overdue';
  return 'upcoming';
}

export function RemindersListScreen({}: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const { items, loading, error, loadReminders, completeReminder, cancelReminder, removeReminder: deleteReminder } = useReminderStore();
  const [toast, setToast] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
  const [revealedPhones, setRevealedPhones] = useState<Record<string, string>>({});
  const [revealingIds, setRevealingIds] = useState<Set<string>>(new Set());

  useEffect(() => { loadReminders(); }, []);

  const grouped = useMemo(() => {
    const result: Record<TabKey, Reminder[]> = { upcoming: [], overdue: [], completed: [] };
    for (const item of items) {
      result[classifyReminder(item)].push(item);
    }
    result.upcoming.sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
    result.overdue.sort((a, b) => new Date(b.due_at).getTime() - new Date(a.due_at).getTime());
    result.completed.sort((a, b) => new Date(b.due_at).getTime() - new Date(a.due_at).getTime());
    return result;
  }, [items]);

  const handleComplete = useCallback(async (id: string) => {
    const ok = await completeReminder(id);
    setToast(ok ? 'Reminder completed' : 'Failed');
  }, [completeReminder]);

  const handleCancel = useCallback(async (id: string) => {
    const ok = await cancelReminder(id);
    setToast(ok ? 'Reminder cancelled' : 'Failed');
  }, [cancelReminder]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    const ok = await deleteReminder(deleteId);
    setToast(ok ? 'Reminder deleted' : 'Failed');
    setDeleteId(null);
  }, [deleteId, deleteReminder]);

  const statusVariant = (s: string) => {
    if (s === 'completed') return 'success' as const;
    if (s === 'cancelled') return 'warning' as const;
    if (s === 'overdue') return 'error' as const;
    return 'info' as const;
  };

  const formatDue = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const absDiff = Math.abs(diffMs);
    const mins = Math.floor(absDiff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);

    let relative = '';
    if (days > 0) relative = `${days}d ${hrs % 24}h`;
    else if (hrs > 0) relative = `${hrs}h ${mins % 60}m`;
    else relative = `${mins}m`;

    const prefix = diffMs > 0 ? 'in ' : '';
    const suffix = diffMs < 0 ? ' ago' : '';

    return {
      dateStr: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      timeStr: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
      relativeStr: `${prefix}${relative}${suffix}`,
    };
  };

  const emptyConfig: Record<TabKey, { icon: string; text: string }> = {
    upcoming: { icon: 'clock-outline', text: 'No upcoming reminders' },
    overdue: { icon: 'check-all', text: 'Nothing overdue' },
    completed: { icon: 'playlist-check', text: 'No completed reminders' },
  };

  const currentData = grouped[activeTab];
  const empty = emptyConfig[activeTab];

  const renderItem = useCallback(({ item }: { item: Reminder }) => {
    const due = formatDue(item.due_at);
    const isOverdue = classifyReminder(item) === 'overdue';
    const isActive = item.status === 'pending' || item.status === 'overdue';

    return (
      <Card style={{ padding: spacing.md, marginBottom: spacing.sm, marginHorizontal: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Icon name="calendar-clock" size={14} color={isOverdue ? colors.error : colors.textSecondary} />
              <Text style={{ ...typography.caption, color: isOverdue ? colors.error : colors.textSecondary }}>
                {due.dateStr} at {due.timeStr}
              </Text>
            </View>
            <Text style={{
              ...typography.caption,
              color: isOverdue ? colors.error : colors.primary,
              fontWeight: '600',
              marginTop: 2,
            }}>
              {due.relativeStr}
            </Text>
            {item.call_from_masked && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={async () => {
                  if (!item.call_id) return;
                  if (revealedPhones[item.id]) {
                    setRevealedPhones(prev => {
                      const next = { ...prev };
                      delete next[item.id];
                      return next;
                    });
                    hapticLight();
                    return;
                  }
                  if (revealingIds.has(item.id)) return;
                  setRevealingIds(prev => new Set(prev).add(item.id));
                  try {
                    const result = await fetchCallerPhone(item.call_id);
                    setRevealedPhones(prev => ({ ...prev, [item.id]: result.phone }));
                    hapticLight();
                  } catch {
                    setToast('Could not reveal number');
                  } finally {
                    setRevealingIds(prev => {
                      const next = new Set(prev);
                      next.delete(item.id);
                      return next;
                    });
                  }
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}
              >
                <Icon
                  name={revealedPhones[item.id] ? 'eye-off-outline' : 'eye-outline'}
                  size={13}
                  color={colors.primary}
                />
                <Text style={{ ...typography.caption, color: revealedPhones[item.id] ? colors.textPrimary : colors.textSecondary }}>
                  {revealingIds.has(item.id) ? '...' : (revealedPhones[item.id] || item.call_from_masked)}
                </Text>
                {!revealedPhones[item.id] && !revealingIds.has(item.id) && (
                  <Text style={{ ...typography.caption, color: colors.primary, fontSize: 10 }}>Tap to reveal</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
          <Badge label={item.status} variant={statusVariant(item.status)} />
        </View>

        {isActive && (
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, borderTopWidth: 0.5, borderTopColor: colors.border, paddingTop: spacing.sm }}>
            <TouchableOpacity
              onPress={() => { hapticLight(); handleComplete(item.id); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: radii.sm, backgroundColor: colors.success + '14' }}
            >
              <Icon name="check-circle-outline" size={16} color={colors.success} />
              <Text style={{ color: colors.success, fontSize: 13, fontWeight: '500' }}>Done</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { hapticLight(); handleCancel(item.id); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: radii.sm, backgroundColor: colors.warning + '14' }}
            >
              <Icon name="close-circle-outline" size={16} color={colors.warning} />
              <Text style={{ color: colors.warning, fontSize: 13, fontWeight: '500' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { hapticLight(); setDeleteId(item.id); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: radii.sm, backgroundColor: colors.error + '14' }}
            >
              <Icon name="delete-outline" size={16} color={colors.error} />
              <Text style={{ color: colors.error, fontSize: 13, fontWeight: '500' }}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  }, [colors, spacing, typography, radii, handleComplete, handleCancel, revealedPhones, revealingIds]);

  return (
    <ScreenWrapper scroll={false}>
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.xs }}>
        <Text style={{ ...typography.h2, color: colors.textPrimary, marginBottom: spacing.md }}>
          Reminders
        </Text>

        {error && (
          <View style={{ marginBottom: spacing.sm }}>
            <ErrorMessage message={error} action="Retry" onAction={loadReminders} />
          </View>
        )}

        {/* Tabs */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: colors.surface,
          borderRadius: radii.md,
          padding: 3,
          marginBottom: spacing.md,
        }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            const count = grouped[tab.key].length;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => { hapticLight(); setActiveTab(tab.key); }}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  paddingVertical: spacing.sm,
                  borderRadius: radii.sm,
                  backgroundColor: active ? colors.primary : 'transparent',
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Icon name={tab.icon} size={16} color={active ? '#fff' : colors.textSecondary} />
                <Text style={{
                  fontSize: 13,
                  fontWeight: active ? '700' : '500',
                  color: active ? '#fff' : colors.textSecondary,
                }}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={{
                    backgroundColor: active ? 'rgba(255,255,255,0.3)' : colors.border,
                    borderRadius: 8,
                    minWidth: 18,
                    height: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: active ? '#fff' : colors.textSecondary }}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={currentData}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadReminders} tintColor={colors.primary} />
        }
        contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.xl }}
        ListEmptyComponent={
          !loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
              <Icon name={empty.icon} size={48} color={colors.textSecondary} />
              <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' }}>
                {empty.text}
              </Text>
            </View>
          ) : null
        }
        renderItem={renderItem}
      />

      <Toast message={toast} type="info" visible={!!toast} onDismiss={() => setToast('')} />
      <ConfirmSheet
        visible={!!deleteId}
        title="Delete Reminder"
        message="Are you sure you want to delete this reminder?"
        destructive
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onDismiss={() => setDeleteId(null)}
      />
    </ScreenWrapper>
  );
}
