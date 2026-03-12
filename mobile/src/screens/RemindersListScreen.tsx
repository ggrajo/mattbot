import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
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
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RemindersList'>;

export function RemindersListScreen({}: Props) {
  const { colors, spacing, typography } = useTheme();
  const { items, loading, error, loadReminders, completeReminder, cancelReminder, removeReminder: deleteReminder } = useReminderStore();
  const [toast, setToast] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { loadReminders(); }, []);

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

  return (
    <ScreenWrapper>
      {error && <ErrorMessage message={error} action="Retry" onAction={loadReminders} />}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadReminders} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
        ListEmptyComponent={
          !loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
              <Icon name="bell-outline" size={48} color={colors.textSecondary} />
              <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.md }}>No reminders</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Card style={{ padding: spacing.md, marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}>{item.title}</Text>
                <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: 2 }}>
                  Due: {new Date(item.due_at).toLocaleString()}
                </Text>
                {item.call_from_masked && (
                  <Text style={{ ...typography.caption, color: colors.textSecondary }}>From: {item.call_from_masked}</Text>
                )}
              </View>
              <Badge text={item.status} variant={statusVariant(item.status)} />
            </View>
            {item.status === 'pending' && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.sm }}>
                <TouchableOpacity onPress={() => handleComplete(item.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="check-circle-outline" size={18} color={colors.success} />
                  <Text style={{ color: colors.success, fontSize: 13 }}>Done</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleCancel(item.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="close-circle-outline" size={18} color={colors.warning} />
                  <Text style={{ color: colors.warning, fontSize: 13 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDeleteId(item.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="delete-outline" size={18} color={colors.error} />
                  <Text style={{ color: colors.error, fontSize: 13 }}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        )}
      />
      {toast !== '' && <Toast message={toast} type="info" onDismiss={() => setToast('')} />}
      <ConfirmSheet
        visible={!!deleteId}
        title="Delete Reminder"
        message="Are you sure you want to delete this reminder?"
        destructive
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </ScreenWrapper>
  );
}
