import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Card } from '../components/ui/Card';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { apiClient } from '../api/client';
import type { Theme } from '../theme/tokens';

interface ContactDetail {
  id: string;
  name: string;
  phone: string;
  is_vip: boolean;
  is_blocked: boolean;
  notes: string;
  memory_items: { id: string; content: string; created_at: string }[];
  call_history: { id: string; status: string; started_at: string; duration_seconds: number | null }[];
}

export function ContactDetailScreen() {
  const theme = useTheme();
  const s = makeStyles(theme);
  const route = useRoute<any>();
  const { contactId } = route.params as { contactId: string };
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<ContactDetail>(`/contacts/${contactId}`)
      .then(({ data }) => setContact(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [contactId]);

  const toggleVip = async (val: boolean) => {
    if (!contact) return;
    setContact({ ...contact, is_vip: val });
    try {
      await apiClient.patch(`/contacts/${contactId}`, { is_vip: val });
    } catch {
      setContact({ ...contact, is_vip: !val });
    }
  };

  const toggleBlocked = async (val: boolean) => {
    if (!contact) return;
    setContact({ ...contact, is_blocked: val });
    try {
      await apiClient.patch(`/contacts/${contactId}`, { is_blocked: val });
    } catch {
      setContact({ ...contact, is_blocked: !val });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!contact) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.empty}>
          <Text style={s.emptyText}>Contact not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.xl, paddingBottom: theme.spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn delay={0}>
          <View style={s.hero}>
            <View style={[s.avatar, { backgroundColor: theme.colors.primary }]}>
              <Text style={s.avatarText}>{(contact.name || '?')[0].toUpperCase()}</Text>
            </View>
            <Text style={s.heroName}>{contact.name}</Text>
            <Text style={s.heroPhone}>{contact.phone}</Text>
          </View>
        </FadeIn>

        <FadeIn delay={60}>
          <Text style={s.sectionHeader}>STATUS</Text>
          <Card>
            <View style={s.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.toggleLabel}>VIP Caller</Text>
                <Text style={s.toggleHint}>Always allow calls through</Text>
              </View>
              <Switch
                value={contact.is_vip}
                onValueChange={toggleVip}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              />
            </View>
            <View style={[s.separator, { backgroundColor: theme.colors.border }]} />
            <View style={s.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.toggleLabel}>Blocked</Text>
                <Text style={s.toggleHint}>Reject all calls from this contact</Text>
              </View>
              <Switch
                value={contact.is_blocked}
                onValueChange={toggleBlocked}
                trackColor={{ false: theme.colors.border, true: theme.colors.error }}
              />
            </View>
          </Card>
        </FadeIn>

        <FadeIn delay={120}>
          <Text style={s.sectionHeader}>MEMORIES</Text>
          <Card>
            {contact.memory_items.length === 0 ? (
              <Text style={s.noData}>No memories recorded for this contact.</Text>
            ) : (
              contact.memory_items.map((mem, idx) => (
                <View key={mem.id}>
                  <View style={s.memoryRow}>
                    <Text style={s.memoryContent}>{mem.content}</Text>
                    <Text style={s.memoryDate}>
                      {new Date(mem.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  {idx < contact.memory_items.length - 1 && (
                    <View style={[s.separator, { backgroundColor: theme.colors.border }]} />
                  )}
                </View>
              ))
            )}
          </Card>
        </FadeIn>

        <FadeIn delay={180}>
          <Text style={s.sectionHeader}>CALL HISTORY</Text>
          <Card>
            {contact.call_history.length === 0 ? (
              <Text style={s.noData}>No call history with this contact.</Text>
            ) : (
              contact.call_history.map((call, idx) => (
                <View key={call.id}>
                  <View style={s.callRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.callStatus}>{call.status.replace('_', ' ')}</Text>
                      <Text style={s.callDate}>
                        {new Date(call.started_at).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <Text style={s.callDuration}>
                      {call.duration_seconds != null
                        ? `${Math.floor(call.duration_seconds / 60)}:${(call.duration_seconds % 60).toString().padStart(2, '0')}`
                        : '--'}
                    </Text>
                  </View>
                  {idx < contact.call_history.length - 1 && (
                    <View style={[s.separator, { backgroundColor: theme.colors.border }]} />
                  )}
                </View>
              ))
            )}
          </Card>
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: Theme) {
  const { colors, spacing, typography } = theme;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    hero: { alignItems: 'center', marginBottom: spacing.xl },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
    heroName: { ...typography.h1, color: colors.textPrimary },
    heroPhone: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
    sectionHeader: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      color: colors.textSecondary,
      marginBottom: 8,
      marginTop: 8,
      marginLeft: 4,
    },
    separator: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    toggleLabel: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
    toggleHint: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
    noData: { ...typography.bodySmall, color: colors.textDisabled, textAlign: 'center', paddingVertical: spacing.md },
    memoryRow: { paddingVertical: 10 },
    memoryContent: { ...typography.body, color: colors.textPrimary, lineHeight: 20 },
    memoryDate: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
    callRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    callStatus: { ...typography.body, color: colors.textPrimary, fontWeight: '600', textTransform: 'capitalize' },
    callDate: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
    callDuration: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
    empty: { alignItems: 'center', paddingTop: 64 },
    emptyText: { ...typography.body, color: colors.textSecondary },
  });
}
