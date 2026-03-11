import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import type { Theme } from '../theme/tokens';
import { memoryApi } from '../api/memory';
import type { CallerDetailResponse, MemoryItem } from '../api/memory';

const MEMORY_TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  fact: { bg: '#E3F2FD', fg: '#1565C0' },
  preference: { bg: '#F3E5F5', fg: '#7B1FA2' },
  action: { bg: '#FFF3E0', fg: '#E65100' },
  note: { bg: '#E8F5E9', fg: '#2E7D32' },
};

export function CallerProfileScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { phoneHash, callerName: initialName } = route.params as {
    phoneHash: string;
    callerName?: string;
  };

  const [profile, setProfile] = useState<CallerDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(initialName || '');
  const [newMemoryContent, setNewMemoryContent] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      setError(null);
      const { data } = await memoryApi.getCallerProfile(phoneHash);
      setProfile(data);
      if (data.caller_name) setNameInput(data.caller_name);
    } catch {
      setError('Failed to load caller profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [phoneHash]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfile();
  }, [fetchProfile]);

  const saveName = async () => {
    try {
      await memoryApi.updateCallerName(phoneHash, nameInput.trim());
      setEditingName(false);
      fetchProfile();
    } catch {
      Alert.alert('Error', 'Failed to update caller name');
    }
  };

  const addMemory = async () => {
    if (!newMemoryContent.trim()) return;
    try {
      await memoryApi.createMemory({
        content: newMemoryContent.trim(),
        memory_type: 'note',
        source: 'user',
        caller_phone_hash: phoneHash,
        caller_name: profile?.caller_name || undefined,
      });
      setNewMemoryContent('');
      fetchProfile();
    } catch {
      Alert.alert('Error', 'Failed to add memory');
    }
  };

  const deleteMemory = async (memoryId: string) => {
    Alert.alert('Delete Memory', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await memoryApi.deleteMemory(memoryId);
            fetchProfile();
          } catch {
            Alert.alert('Error', 'Failed to delete memory');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = profile?.caller_name || `Caller ${phoneHash.slice(0, 8)}`;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <FadeIn delay={0}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(profile?.caller_name || '?')[0].toUpperCase()}
              </Text>
            </View>

            {editingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  style={styles.nameInput}
                  value={nameInput}
                  onChangeText={setNameInput}
                  placeholder="Enter caller name"
                  placeholderTextColor={theme.colors.textDisabled}
                  autoFocus
                />
                <TouchableOpacity onPress={saveName} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setEditingName(false)}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditingName(true)}>
                <Text style={styles.callerName}>{displayName}</Text>
                <Text style={styles.editHint}>Tap to edit name</Text>
              </TouchableOpacity>
            )}

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{profile?.memories.length || 0}</Text>
                <Text style={styles.statLabel}>Memories</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{profile?.call_count || 0}</Text>
                <Text style={styles.statLabel}>Calls</Text>
              </View>
            </View>
          </View>
        </FadeIn>

        <FadeIn delay={80}>
          <Text style={styles.sectionTitle}>Add Memory</Text>
          <View style={styles.addMemoryRow}>
            <TextInput
              style={styles.addMemoryInput}
              value={newMemoryContent}
              onChangeText={setNewMemoryContent}
              placeholder="Add a note about this caller..."
              placeholderTextColor={theme.colors.textDisabled}
              multiline
            />
            <TouchableOpacity
              onPress={addMemory}
              style={[
                styles.addBtn,
                !newMemoryContent.trim() && styles.addBtnDisabled,
              ]}
              disabled={!newMemoryContent.trim()}
            >
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        </FadeIn>

        <FadeIn delay={160}>
          <Text style={styles.sectionTitle}>
            Memories ({profile?.memories.length || 0})
          </Text>

          {(!profile?.memories || profile.memories.length === 0) ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No memories yet for this caller.</Text>
            </View>
          ) : (
            profile.memories.map((item) => (
              <MemoryCard
                key={item.id}
                item={item}
                theme={theme}
                onDelete={() => deleteMemory(item.id)}
              />
            ))
          )}
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}

function MemoryCard({
  item,
  theme,
  onDelete,
}: {
  item: MemoryItem;
  theme: Theme;
  onDelete: () => void;
}) {
  const typeColor = MEMORY_TYPE_COLORS[item.memory_type] ?? { bg: '#ECEFF1', fg: '#546E7A' };
  const { colors, spacing, radii, typography, shadows } = theme;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        padding: spacing.xl,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.card,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <View
          style={{
            backgroundColor: typeColor.bg,
            paddingHorizontal: spacing.sm,
            paddingVertical: 2,
            borderRadius: radii.full,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '700', color: typeColor.fg, textTransform: 'uppercase' }}>
            {item.memory_type}
          </Text>
        </View>
        <TouchableOpacity onPress={onDelete}>
          <Text style={{ ...typography.caption, color: colors.error }}>Delete</Text>
        </TouchableOpacity>
      </View>
      <Text style={{ ...typography.body, color: colors.textPrimary }}>{item.content}</Text>
      <Text style={{ ...typography.caption, color: colors.textDisabled, marginTop: spacing.xs }}>
        {item.source} &middot; {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, spacing, radii, typography, shadows } = theme;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    loader: { marginTop: spacing.xxl },
    scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
    errorBox: {
      backgroundColor: colors.errorContainer,
      margin: spacing.xl,
      padding: spacing.md,
      borderRadius: radii.md,
    },
    errorText: { ...typography.bodySmall, color: colors.error },
    profileHeader: { alignItems: 'center', marginBottom: spacing.xl },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    avatarText: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
    callerName: { ...typography.h2, color: colors.textPrimary, textAlign: 'center' },
    editHint: { ...typography.caption, color: colors.textDisabled, textAlign: 'center', marginTop: 2 },
    nameEditRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    nameInput: {
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
    saveBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
    },
    saveBtnText: { ...typography.bodySmall, color: '#FFF', fontWeight: '700' },
    cancelBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    cancelBtnText: { ...typography.bodySmall, color: colors.textSecondary },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.xxl,
      marginTop: spacing.lg,
    },
    stat: { alignItems: 'center' },
    statValue: { ...typography.h2, color: colors.textPrimary },
    statLabel: { ...typography.caption, color: colors.textSecondary },
    sectionTitle: {
      ...typography.h3,
      color: colors.textPrimary,
      marginBottom: spacing.md,
      marginTop: spacing.lg,
    },
    addMemoryRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    addMemoryInput: {
      ...typography.body,
      color: colors.textPrimary,
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      minHeight: 44,
    },
    addBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      justifyContent: 'center',
      borderRadius: radii.md,
    },
    addBtnDisabled: { opacity: 0.4 },
    addBtnText: { ...typography.bodySmall, color: '#FFF', fontWeight: '700' },
    emptyState: { alignItems: 'center', paddingVertical: spacing.xl },
    emptyText: { ...typography.body, color: colors.textDisabled },
  });
}
