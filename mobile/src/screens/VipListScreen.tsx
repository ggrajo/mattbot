import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { FadeIn } from '../components/ui/FadeIn';
import { Card } from '../components/ui/Card';
import { PhoneInput } from '../components/ui/PhoneInput';
import { Button } from '../components/ui/Button';
import { apiClient } from '../api/client';
import { extractApiError } from '../api/client';
import type { Theme } from '../theme/tokens';

interface VipEntry {
  id: string;
  phone_e164: string;
  name: string | null;
  added_at: string;
}

function formatPhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function VipListScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const navigation = useNavigation<any>();

  const [items, setItems] = useState<VipEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchVip = useCallback(async () => {
    try {
      const { data } = await apiClient.get<VipEntry[] | { items?: VipEntry[] }>('/vip');
      const list = Array.isArray(data) ? data : (data?.items ?? []);
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVip();
  }, [fetchVip]);

  const handleAdd = async () => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) return;
    setAdding(true);
    try {
      await apiClient.post('/vip', {
        phone_e164: trimmedPhone,
        name: name.trim() || undefined,
      });
      setPhone('');
      setName('');
      await fetchVip();
    } catch (err) {
      Alert.alert('Error', extractApiError(err));
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = (item: VipEntry) => {
    Alert.alert(
      'Remove VIP',
      `Remove ${item.name || formatPhone(item.phone_e164)} from your VIP list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(item.id);
            try {
              await apiClient.delete(`/vip/${item.id}`);
              await fetchVip();
            } catch (err) {
              Alert.alert('Error', extractApiError(err));
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item, index }: { item: VipEntry; index: number }) => (
    <FadeIn delay={index * 40}>
      <View style={styles.listItem}>
        <View style={styles.listItemIcon}>
          <Text style={styles.starIcon}>⭐</Text>
        </View>
        <View style={styles.listItemContent}>
          <Text style={styles.listItemName}>
            {item.name || formatPhone(item.phone_e164)}
          </Text>
          {item.name && (
            <Text style={styles.listItemPhone}>{formatPhone(item.phone_e164)}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          disabled={deletingId === item.id}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Remove VIP"
        >
          {deletingId === item.id ? (
            <ActivityIndicator size="small" color={theme.colors.error} />
          ) : (
            <Text style={styles.deleteIcon}>✕</Text>
          )}
        </TouchableOpacity>
      </View>
    </FadeIn>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FadeIn delay={0}>
          <Text style={styles.heading}>VIP Contacts</Text>
          <Text style={styles.subtitle}>
            VIPs get priority treatment. Their calls can bypass quiet hours and screening.
          </Text>
        </FadeIn>

        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
        ) : (
          <>
            <FadeIn delay={40}>
              <Card>
                {items.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>⭐</Text>
                    <Text style={styles.emptyText}>No VIP contacts yet</Text>
                    <Text style={styles.emptyHint}>Add important contacts below</Text>
                  </View>
                ) : (
                  items.map((item, index) => (
                    <View key={item.id}>
                      {renderItem({ item, index })}
                      {index < items.length - 1 && (
                        <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
                      )}
                    </View>
                  ))
                )}
              </Card>
            </FadeIn>

            <FadeIn delay={80}>
              <Card>
                <Text style={styles.addSectionTitle}>Add VIP</Text>
                <PhoneInput
                  label="Phone Number"
                  value={phone}
                  onChangeText={setPhone}
                />
                <TextInput
                  style={[
                    styles.nameInput,
                    {
                      color: theme.colors.textPrimary,
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.surface,
                    },
                  ]}
                  placeholder="Name (optional)"
                  placeholderTextColor={theme.colors.textDisabled}
                  value={name}
                  onChangeText={setName}
                />
                <Button
                  title="Add VIP"
                  onPress={handleAdd}
                  loading={adding}
                  disabled={!phone.trim()}
                  style={styles.addButton}
                />
              </Card>
            </FadeIn>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, spacing, radii, typography } = theme;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
    heading: { ...typography.h1, color: colors.textPrimary, marginBottom: spacing.sm },
    subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xl },
    loader: { marginTop: spacing.xxl },
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    listItemIcon: {
      width: 40,
      height: 40,
      borderRadius: radii.md,
      backgroundColor: colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    starIcon: { fontSize: 20 },
    listItemContent: { flex: 1 },
    listItemName: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
    listItemPhone: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
    deleteIcon: {
      fontSize: 18,
      color: colors.error,
      fontWeight: '600',
      padding: spacing.sm,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      marginLeft: 56,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
    },
    emptyIcon: { fontSize: 48, marginBottom: spacing.md },
    emptyText: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xs },
    emptyHint: { ...typography.caption, color: colors.textDisabled },
    addSectionTitle: {
      ...typography.h3,
      color: colors.textPrimary,
      marginBottom: spacing.lg,
    },
    nameInput: {
      ...typography.body,
      borderWidth: 1.5,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      marginBottom: spacing.lg,
    },
    addButton: { marginTop: spacing.sm },
  });
}
