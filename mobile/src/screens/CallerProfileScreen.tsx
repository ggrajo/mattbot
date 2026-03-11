import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { apiClient } from '../api/client';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CallerProfile'>;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function CallerProfileScreen({ route }: Props) {
  const { phoneHash } = route.params;
  const { colors, spacing, typography, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  async function load() {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get(`/callers/${phoneHash}/profile`);
      setProfile(res);
      setError(undefined);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Failed to load caller profile');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  async function handleVip() {
    const callId = profile?.last_call_id;
    if (!callId) {
      Alert.alert('Error', 'No call found for this caller');
      return;
    }
    try {
      if (profile?.is_vip) {
        await apiClient.delete(`/calls/${callId}/mark-vip`);
      } else {
        await apiClient.post(`/calls/${callId}/mark-vip`);
      }
      load();
    } catch {
      Alert.alert('Error', 'Failed to update VIP status');
    }
  }

  async function handleBlock() {
    const callId = profile?.last_call_id;
    if (!callId) {
      Alert.alert('Error', 'No call found for this caller');
      return;
    }
    Alert.alert('Block Caller', 'Are you sure you want to block this caller?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.post(`/calls/${callId}/mark-blocked`);
            load();
          } catch {
            Alert.alert('Error', 'Failed to block caller');
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <Icon name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={{ ...typography.body, color: colors.error, marginTop: spacing.md, textAlign: 'center' }}>
          {error || 'Profile not found'}
        </Text>
        <Pressable onPress={load} style={{ marginTop: spacing.md }}>
          <Text style={{ ...typography.button, color: colors.primary }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const callHistory = profile.recent_calls ?? profile.calls ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Icon name="arrow-left" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ ...typography.h3, color: colors.textPrimary, marginLeft: spacing.md }}>Caller Profile</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40 }}
      >
        <FadeIn delay={0}>
          <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: colors.primary + '18',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.md,
              }}
            >
              <Icon name="account-outline" size={40} color={colors.primary} />
            </View>
            <Text style={{ ...typography.h2, color: colors.textPrimary }}>
              {profile.vip_display_name || profile.name || profile.phone_masked || 'Unknown'}
            </Text>
            {(profile.vip_company || profile.vip_relationship) && (
              <Text style={{ ...typography.bodySmall, color: colors.textSecondary, marginTop: 4 }}>
                {[profile.vip_relationship, profile.vip_company].filter(Boolean).join(' ┬╖ ')}
              </Text>
            )}
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
              {profile.is_vip && (
                <View style={{ backgroundColor: '#FBBF24' + '25', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#FBBF24' }}>VIP</Text>
                </View>
              )}
              {profile.is_blocked && (
                <View style={{ backgroundColor: colors.error + '25', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.error }}>Blocked</Text>
                </View>
              )}
            </View>
          </View>
        </FadeIn>

        <FadeIn delay={60}>
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: colors.surface,
              borderRadius: radii.xl,
              padding: spacing.lg,
              borderWidth: 1,
              borderColor: colors.border,
              marginBottom: spacing.lg,
            }}
          >
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ ...typography.h2, color: colors.textPrimary }}>
                {profile.call_count ?? profile.total_calls ?? 0}
              </Text>
              <Text style={{ ...typography.caption, color: colors.textSecondary }}>Total Calls</Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' }}>
                {(profile.last_call_date || profile.last_call_at) ? timeAgo(profile.last_call_date || profile.last_call_at) : 'N/A'}
              </Text>
              <Text style={{ ...typography.caption, color: colors.textSecondary }}>Last Call</Text>
            </View>
          </View>
        </FadeIn>

        <FadeIn delay={100}>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
            <Pressable
              onPress={handleVip}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
                paddingVertical: spacing.md,
                backgroundColor: '#FBBF24' + '15',
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: '#FBBF24' + '30',
              }}
            >
              <Icon name={profile.is_vip ? 'star' : 'star-outline'} size={18} color="#FBBF24" />
              <Text style={{ ...typography.button, color: '#FBBF24', fontSize: 14 }}>
                {profile.is_vip ? 'Remove VIP' : 'Add to VIP'}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleBlock}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
                paddingVertical: spacing.md,
                backgroundColor: colors.error + '15',
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.error + '30',
              }}
            >
              <Icon name="block-helper" size={18} color={colors.error} />
              <Text style={{ ...typography.button, color: colors.error, fontSize: 14 }}>Block</Text>
            </Pressable>
          </View>
        </FadeIn>

        {callHistory.length > 0 && (
          <FadeIn delay={140}>
            <Text style={{ ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md }}>
              Call History
            </Text>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: 'hidden',
              }}
            >
              {callHistory.map((call: any, idx: number) => (
                <Pressable
                  key={call.id || idx}
                  onPress={() => navigation.navigate('CallDetail', { callId: call.id })}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.lg,
                    backgroundColor: pressed ? colors.surfaceVariant : 'transparent',
                    borderBottomWidth: idx < callHistory.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  })}
                >
                  <Icon
                    name={call.status === 'completed' ? 'phone-check' : 'phone-missed'}
                    size={18}
                    color={call.status === 'completed' ? '#10B981' : '#EF4444'}
                  />
                  <View style={{ flex: 1, marginLeft: spacing.md }}>
                    <Text style={{ ...typography.bodySmall, color: colors.textPrimary }}>
                      {timeAgo(call.started_at || call.created_at)}
                    </Text>
                  </View>
                  <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                    {call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}m` : '--'}
                  </Text>
                  <Icon name="chevron-right" size={18} color={colors.textSecondary} />
                </Pressable>
              ))}
            </View>
          </FadeIn>
        )}
      </ScrollView>
    </View>
  );
}
