import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Badge } from '../components/ui/Badge';
import { FadeIn } from '../components/ui/FadeIn';
import { Button } from '../components/ui/Button';
import { useTheme } from '../theme/ThemeProvider';
import { apiClient } from '../api/client';
import { extractApiError } from '../api/client';
import type { Theme } from '../theme/tokens';

type FilterTab = 'upcoming' | 'completed' | 'overdue';
type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'secondary' | 'info';

interface Reminder {
  id: string;
  title: string;
  notes?: string | null;
  due_date: string;
  status: 'pending' | 'completed' | 'overdue';
  call_id?: string | null;
  created_at?: string;
}

const STATUS_BADGE: Record<string, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'success' },
  overdue: { label: 'Overdue', variant: 'error' },
};

function formatDueDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0 && diffDays < 7) return `${diffDays} days`;
  if (diffDays < 0 && diffDays > -7) return `${Math.abs(diffDays)} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getFilteredReminders(reminders: Reminder[], filter: FilterTab): Reminder[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filter) {
    case 'upcoming':
      return reminders.filter((r) => {
        if (r.status === 'completed') return false;
        const due = new Date(r.due_date);
        return due >= today;
      });
    case 'completed':
      return reminders.filter((r) => r.status === 'completed');
    case 'overdue':
      return reminders.filter((r) => {
        if (r.status === 'completed') return false;
        const due = new Date(r.due_date);
        return due < today;
      });
    default:
      return reminders;
  }
}

const EMPTY_MESSAGES: Record<FilterTab, string> = {
  upcoming: 'No upcoming reminders',
  completed: 'No completed reminders',
  overdue: 'No overdue reminders',
};

function EmptyState({ filter, theme }: { filter: FilterTab; theme: Theme }) {
  const { colors, spacing, typography } = theme;
  const navigation = useNavigation<any>();

  return (
    <FadeIn delay={100}>
      <View style={emptyStyles.container}>
        <View style={[emptyStyles.illustration, { backgroundColor: colors.surfaceVariant }]}>
          <Text style={emptyStyles.emoji}>⏰</Text>
        </View>
        <Text style={[typography.h3, { color: colors.textSecondary, marginBottom: spacing.sm, textAlign: 'center' }]}>
          {EMPTY_MESSAGES[filter]}
        </Text>
        <Text
          style={[
            typography.body,
            { color: colors.textDisabled, textAlign: 'center', paddingHorizontal: spacing.xl, lineHeight: 22 },
          ]}
        >
          {filter === 'upcoming'
            ? 'Create a reminder to get started.'
            : filter === 'completed'
              ? 'Completed reminders will appear here.'
              : 'Overdue reminders will appear here.'}
        </Text>
        {filter === 'upcoming' && (
          <Button
            title="Create Reminder"
            onPress={() => navigation.navigate('CreateReminder')}
            style={{ marginTop: spacing.lg }}
          />
        )}
      </View>
    </FadeIn>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: 32,
  },
  illustration: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emoji: {
    fontSize: 36,
  },
});

export function RemindersListScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const navigation = useNavigation<any>();

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('upcoming');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchReminders = useCallback(async () => {
    setError(null);
    try {
      const { data } = await apiClient.get<Reminder[] | { reminders: Reminder[] }>('/reminders');
      const list = Array.isArray(data) ? data : (data as { reminders: Reminder[] }).reminders;
      setReminders(list ?? []);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const onRefresh = useCallback(() => {
    setLoading(true);
    fetchReminders();
  }, [fetchReminders]);

  const filtered = getFilteredReminders(reminders, filter);

  const handleMarkComplete = useCallback(
    async (reminder: Reminder) => {
      if (reminder.status === 'completed') return;
      setActionLoadingId(reminder.id);
      try {
        await apiClient.patch(`/reminders/${reminder.id}`, { status: 'completed' });
        setReminders((prev) =>
          prev.map((r) => (r.id === reminder.id ? { ...r, status: 'completed' as const } : r))
        );
      } catch (err) {
        Alert.alert('Error', extractApiError(err));
      } finally {
        setActionLoadingId(null);
      }
    },
    []
  );

  const handleDelete = useCallback(
    (reminder: Reminder) => {
      Alert.alert(
        'Delete Reminder',
        `Are you sure you want to delete "${reminder.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setActionLoadingId(reminder.id);
              try {
                await apiClient.delete(`/reminders/${reminder.id}`);
                setReminders((prev) => prev.filter((r) => r.id !== reminder.id));
                setExpandedId(null);
              } catch (err) {
                Alert.alert('Error', extractApiError(err));
              } finally {
                setActionLoadingId(null);
              }
            },
          },
        ]
      );
    },
    []
  );

  const renderReminder = ({ item }: { item: Reminder }) => {
    const badge = STATUS_BADGE[item.status] ?? { label: item.status, variant: 'info' as BadgeVariant };
    const isExpanded = expandedId === item.id;
    const isActionLoading = actionLoadingId === item.id;
    const notesPreview = item.notes ? (item.notes.length > 60 ? `${item.notes.slice(0, 60)}...` : item.notes) : null;

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.dueDate}>{formatDueDate(item.due_date)}</Text>
          </View>
          <Badge label={badge.label} variant={badge.variant} size="sm" />
        </View>
        {notesPreview && (
          <Text style={styles.notesPreview} numberOfLines={1}>
            {notesPreview}
          </Text>
        )}
        {isExpanded && (
          <FadeIn delay={0} duration={200}>
            <View style={styles.expanded}>
              {item.notes && (
                <Text style={styles.notesFull}>{item.notes}</Text>
              )}
              {item.call_id && (
                <View style={[styles.linkedBadge, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Text style={[styles.linkedText, { color: theme.colors.primary }]}>Linked to call</Text>
                </View>
              )}
              <View style={styles.actions}>
                {item.status !== 'completed' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: theme.colors.successContainer }]}
                    onPress={() => handleMarkComplete(item)}
                    disabled={isActionLoading}
                  >
                    {isActionLoading ? (
                      <ActivityIndicator size="small" color={theme.colors.success} />
                    ) : (
                      <Text style={[styles.actionText, { color: theme.colors.success }]}>Mark complete</Text>
                    )}
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: theme.colors.errorContainer }]}
                  onPress={() => handleDelete(item)}
                  disabled={isActionLoading}
                >
                  <Text style={[styles.actionText, { color: theme.colors.error }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </FadeIn>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FadeIn delay={0}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reminders</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateReminder')}
            style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={styles.addBtnText}>+ Create</Text>
          </TouchableOpacity>
        </View>
      </FadeIn>

      <FadeIn delay={40}>
        <View style={styles.tabs}>
          {(['upcoming', 'completed', 'overdue'] as const).map((tab) => (
            <Pressable
              key={tab}
              style={[
                styles.tab,
                filter === tab && { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => setFilter(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: filter === tab ? theme.colors.onPrimary : theme.colors.textSecondary },
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </FadeIn>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading && reminders.length === 0 ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderReminder}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
          ListEmptyComponent={<EmptyState filter={filter} theme={theme} />}
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
    headerTitle: { ...typography.h1, color: colors.textPrimary },
    addBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
    },
    addBtnText: { ...typography.bodySmall, color: colors.onPrimary, fontWeight: '600' },
    tabs: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      marginBottom: spacing.lg,
    },
    tab: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radii.full,
      backgroundColor: colors.surfaceVariant,
    },
    tabText: { ...typography.bodySmall, fontWeight: '600' },
    errorBox: {
      backgroundColor: colors.errorContainer,
      marginHorizontal: spacing.xl,
      padding: spacing.md,
      borderRadius: radii.md,
      marginBottom: spacing.md,
    },
    errorText: { ...typography.bodySmall, color: colors.error },
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
    cardPressed: { opacity: 0.9 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardLeft: { flex: 1, marginRight: spacing.md },
    title: { ...typography.h3, color: colors.textPrimary },
    dueDate: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
    notesPreview: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    expanded: {
      marginTop: spacing.lg,
      paddingTop: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    notesFull: { ...typography.body, color: colors.textPrimary, marginBottom: spacing.sm },
    linkedBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radii.sm,
      marginBottom: spacing.md,
    },
    linkedText: { ...typography.caption, fontWeight: '600' },
    actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    actionBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
    },
    actionText: { ...typography.bodySmall, fontWeight: '600' },
  });
}
