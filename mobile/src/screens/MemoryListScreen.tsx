import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { apiClient, extractApiError } from '../api/client';

interface MemoryItem {
  id: string;
  memory_type: string;
  subject?: string | null;
  value?: string | null;
  confidence?: number | null;
  user_confirmed: boolean;
  source_call_id?: string | null;
  caller_phone_hash?: string | null;
  created_at: string;
}

export function MemoryListScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newContent, setNewContent] = useState('');
  const [adding, setAdding] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await apiClient.get('/memory');
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

  async function handleAdd() {
    const content = newContent.trim();
    if (!content) return;
    try {
      setAdding(true);
      await apiClient.post('/memory', {
        memory_type: 'communication_preference',
        subject: content.substring(0, 50),
        value: content,
      });
      setNewContent('');
      setShowInput(false);
      await loadItems();
    } catch (e) {
      Alert.alert('Error', extractApiError(e));
    } finally {
      setAdding(false);
    }
  }

  async function handleSaveEdit(id: string) {
    const content = editContent.trim();
    if (!content) return;
    try {
      setSaving(true);
      await apiClient.patch(`/memory/${id}`, { value: content });
      setEditingId(null);
      setEditContent('');
      await loadItems();
    } catch (e) {
      Alert.alert('Error', extractApiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: MemoryItem) {
    try {
      await apiClient.delete(`/memory/${item.id}`);
      await loadItems();
    } catch (e) {
      Alert.alert('Error', extractApiError(e));
    }
  }

  function handleClearAll() {
    Alert.alert(
      'Clear All Memories',
      'This will permanently delete all AI memories. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete('/memory');
              await loadItems();
            } catch (e) {
              Alert.alert('Error', extractApiError(e));
            }
          },
        },
      ],
    );
  }

  function startEdit(item: MemoryItem) {
    setEditingId(item.id);
    setEditContent(item.value || '');
  }

  function renderItem({ item, index }: { item: MemoryItem; index: number }) {
    const date = new Date(item.created_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const isEditing = editingId === item.id;

    return (
      <FadeIn delay={index * 40} slide="up">
        <View
          style={{
            backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
            borderRadius: radii.lg,
            padding: spacing.lg,
            marginBottom: spacing.sm,
            borderWidth: isEditing ? 2 : 1,
            borderColor: isEditing ? colors.primary : (theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder),
          }}
        >
          {isEditing ? (
            <>
              <TextInput
                value={editContent}
                onChangeText={setEditContent}
                multiline
                style={{
                  backgroundColor: colors.surfaceVariant,
                  borderRadius: radii.md,
                  padding: spacing.md,
                  color: colors.textPrimary,
                  ...typography.body,
                  minHeight: 80,
                  textAlignVertical: 'top',
                }}
              />
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                <TouchableOpacity
                  onPress={() => handleSaveEdit(item.id)}
                  disabled={saving}
                  style={{
                    flex: 1,
                    backgroundColor: colors.primary,
                    borderRadius: radii.md,
                    paddingVertical: spacing.sm,
                    alignItems: 'center',
                    opacity: saving ? 0.5 : 1,
                  }}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.onPrimary} size="small" />
                  ) : (
                    <Text style={{ ...typography.caption, color: colors.onPrimary, fontWeight: '700' }}>Save</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setEditingId(null); setEditContent(''); }}
                  style={{
                    flex: 1,
                    backgroundColor: colors.surfaceVariant,
                    borderRadius: radii.md,
                    paddingVertical: spacing.sm,
                    alignItems: 'center',
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ ...typography.caption, color: colors.textPrimary, fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
            <TouchableOpacity onPress={() => startEdit(item)} activeOpacity={0.7}>
              {item.subject && (
                <Text style={{ ...typography.caption, color: colors.textSecondary, fontWeight: '600', marginBottom: 2 }}>
                  {item.subject}
                </Text>
              )}
              <Text style={{ ...typography.body, color: colors.textPrimary }} numberOfLines={3}>
                {item.value || ''}
              </Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Text style={{ ...typography.caption, color: colors.textDisabled }}>{date}</Text>
                {item.memory_type && (
                  <>
                    <Text style={{ ...typography.caption, color: colors.textDisabled }}> · </Text>
                    <Text style={{ ...typography.caption, color: colors.textDisabled }}>{item.memory_type.replace(/_/g, ' ')}</Text>
                  </>
                )}
                </View>
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <TouchableOpacity onPress={() => startEdit(item)} hitSlop={8}>
                    <Icon name="pencil-outline" size="md" color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={8}>
                    <Icon name="trash-can-outline" size="md" color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>
      </FadeIn>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + spacing.lg,
        paddingHorizontal: spacing.lg,
      }}
    >
      <FadeIn delay={0} slide="up">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }}>
          <Icon name="brain" size="lg" color={colors.primary} />
          <Text style={{ ...typography.h2, color: colors.textPrimary, flex: 1 }}>AI Memory</Text>
          <TouchableOpacity onPress={() => setShowInput(!showInput)} hitSlop={8} style={{ marginRight: spacing.sm }}>
            <Icon name={showInput ? 'close' : 'plus-circle-outline'} size="lg" color={colors.primary} />
          </TouchableOpacity>
          {items.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} hitSlop={8}>
              <Icon name="delete-sweep-outline" size="lg" color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </FadeIn>

      {showInput && (
        <FadeIn delay={0} slide="up">
          <View style={{ marginBottom: spacing.md }}>
            <TextInput
              value={newContent}
              onChangeText={setNewContent}
              placeholder="Add a memory for the AI..."
              placeholderTextColor={colors.textDisabled}
              multiline
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.md,
                padding: spacing.md,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                color: colors.textPrimary,
                ...typography.body,
                minHeight: 80,
                textAlignVertical: 'top',
                marginBottom: spacing.sm,
              }}
            />
            <TouchableOpacity
              onPress={handleAdd}
              disabled={adding || !newContent.trim()}
              style={{
                backgroundColor: colors.primary,
                borderRadius: radii.md,
                paddingVertical: spacing.sm,
                alignItems: 'center',
                opacity: adding || !newContent.trim() ? 0.5 : 1,
              }}
              activeOpacity={0.8}
            >
              {adding ? (
                <ActivityIndicator color={colors.onPrimary} size="small" />
              ) : (
                <Text style={{ ...typography.button, color: colors.onPrimary }}>Add Memory</Text>
              )}
            </TouchableOpacity>
          </View>
        </FadeIn>
      )}

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
          }}
        >
          <Icon name="alert-circle-outline" size="md" color={colors.error} />
          <Text style={{ ...typography.bodySmall, color: colors.error, flex: 1 }}>{error}</Text>
        </View>
      )}

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={loadItems}
        contentContainerStyle={
          items.length === 0
            ? { flex: 1, justifyContent: 'center', alignItems: 'center' }
            : { paddingBottom: insets.bottom + spacing.xxl }
        }
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: 'center', paddingHorizontal: spacing.xl }}>
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
                <Icon name="brain" size={32} color={colors.primary} />
              </View>
              <Text
                style={{ ...typography.h3, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.xs }}
              >
                AI has no memories yet
              </Text>
              <Text
                style={{ ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center' }}
              >
                Memories help the AI remember important details about your callers
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
