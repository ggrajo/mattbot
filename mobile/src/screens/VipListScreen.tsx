import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/TextInput';
import { PhoneInput } from '../components/ui/PhoneInput';
import { Toast } from '../components/ui/Toast';
import { ConfirmSheet } from '../components/ui/ConfirmSheet';
import { FadeIn } from '../components/ui/FadeIn';
import { StatusScreen } from '../components/ui/StatusScreen';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { ContactPicker } from '../components/ContactPicker';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { useVipStore } from '../store/vipStore';
import { extractApiError } from '../api/client';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { formatRelative } from '../utils/formatDate';
import type { VipEntry } from '../api/vip';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'VipList'>;

export function VipListScreen({ navigation }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const userTz = useSettingsStore((s) => s.settings?.timezone) || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { items, loading, error, loadVip, addVip, removeVip } = useVipStore();

  const [phoneE164, setPhoneE164] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [company, setCompany] = useState('');
  const [relationship, setRelationship] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [removeTarget, setRemoveTarget] = useState<VipEntry | null>(null);

  useEffect(() => {
    loadVip();
  }, []);

  const handleRefresh = useCallback(() => {
    loadVip();
  }, [loadVip]);

  async function handleAdd() {
    if (!phoneE164.trim()) {
      setToastType('error');
      setToast('Phone number is required');
      return;
    }
    hapticMedium();
    setAdding(true);
    const ok = await addVip({
      phone_number: phoneE164.trim(),
      display_name: displayName.trim() || undefined,
      company: company.trim() || undefined,
      relationship: relationship.trim() || undefined,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    if (ok) {
      setToastType('success');
      setToast('Added to VIP list');
      setPhoneE164('');
      setDisplayName('');
      setCompany('');
      setRelationship('');
      setEmail('');
      setNotes('');
      setShowForm(false);
    } else {
      setToastType('error');
      setToast(useVipStore.getState().error ?? 'Failed to add VIP');
    }
    setAdding(false);
  }

  async function handleRemove() {
    if (!removeTarget) return;
    hapticMedium();
    const ok = await removeVip(removeTarget.id);
    if (ok) {
      setToastType('success');
      setToast('Removed from VIP');
    } else {
      setToastType('error');
      setToast(useVipStore.getState().error ?? 'Failed to remove');
    }
    setRemoveTarget(null);
  }

  function handleContactPick(selected: { phoneNumber: string; displayName?: string; company?: string }) {
    if (selected.phoneNumber) setPhoneE164(selected.phoneNumber);
    if (selected.displayName) setDisplayName(selected.displayName);
    if (selected.company) setCompany(selected.company);
  }

  function renderItem({ item, index }: { item: VipEntry; index: number }) {
    const row = (
      <Card variant="elevated" style={{ marginBottom: spacing.sm }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: '#F59E0B' + '18',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="star" size="md" color="#F59E0B" />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                ...typography.body,
                color: colors.textPrimary,
                fontWeight: '600',
              }}
              numberOfLines={1}
              allowFontScaling
            >
              {item.display_name || `••${item.phone_last4}`}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
                marginTop: 2,
              }}
            >
              <Text
                style={{ ...typography.caption, color: colors.textSecondary }}
                allowFontScaling
              >
                ••{item.phone_last4}
              </Text>
              {item.company && (
                <Text
                  style={{
                    ...typography.caption,
                    color: colors.textSecondary,
                  }}
                  numberOfLines={1}
                  allowFontScaling
                >
                  · {item.company}
                </Text>
              )}
              {item.relationship && (
                <Text
                  style={{
                    ...typography.caption,
                    color: colors.textSecondary,
                    fontStyle: 'italic',
                  }}
                  numberOfLines={1}
                  allowFontScaling
                >
                  · {item.relationship}
                </Text>
              )}
              <Text
                style={{
                  ...typography.caption,
                  color: colors.textSecondary,
                  marginLeft: 'auto',
                }}
                allowFontScaling
              >
                {formatRelative(item.created_at, userTz)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => {
              hapticLight();
              setRemoveTarget(item);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.display_name || item.phone_last4} from VIP`}
          >
            <Icon
              name="close-circle-outline"
              size="md"
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </Card>
    );

    if (index < 6) {
      return <FadeIn delay={Math.min(index * 40, 200)}>{row}</FadeIn>;
    }
    return row;
  }

  return (
    <ScreenWrapper scroll={false} keyboardAvoiding={false}>
      <Toast
        message={toast}
        type={toastType}
        visible={!!toast}
        onDismiss={() => setToast('')}
      />

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          marginBottom: spacing.lg,
        }}
      >
        <Icon name="star" size="lg" color="#F59E0B" />
        <Text
          style={{ ...typography.h2, color: colors.textPrimary, flex: 1 }}
          allowFontScaling
        >
          VIP List
        </Text>
        {items.length > 0 && (
          <Text
            style={{ ...typography.caption, color: colors.textSecondary }}
            allowFontScaling
          >
            {items.length} VIP{items.length !== 1 ? 's' : ''}
          </Text>
        )}
        <TouchableOpacity
          onPress={() => {
            hapticLight();
            navigation.navigate('AddContact', { autoVip: true });
          }}
          activeOpacity={0.7}
          style={{
            width: 40,
            height: 40,
            borderRadius: radii.xl,
            backgroundColor: '#F59E0B' + '18',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityRole="button"
          accessibilityLabel="Add VIP number"
        >
          <Icon
            name="plus"
            size="md"
            color="#F59E0B"
          />
        </TouchableOpacity>
      </View>

      {/* Add Form */}
      {showForm && (
        <FadeIn delay={0}>
          <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
            <View style={{ gap: spacing.md }}>
              <PhoneInput
                value={phoneE164}
                onChangeE164={setPhoneE164}
                label="Phone Number"
              />
              <ContactPicker
                onSelect={handleContactPick}
                buttonLabel="From Contacts"
              />
              <TextInput
                label="Display Name (optional)"
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="John Smith"
              />
              <TextInput
                label="Company (optional)"
                value={company}
                onChangeText={setCompany}
                placeholder="Acme Corp"
              />
              <TextInput
                label="Relationship (optional)"
                value={relationship}
                onChangeText={setRelationship}
                placeholder="e.g. Client, Partner"
              />
              <TextInput
                label="Email (optional)"
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                keyboardType="email-address"
              />
              <TextInput
                label="Notes (optional)"
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional notes..."
                multiline
                numberOfLines={2}
              />
              <Button
                title={adding ? 'Adding...' : 'Add to VIP'}
                icon="star-outline"
                onPress={handleAdd}
                loading={adding}
                disabled={adding || !phoneE164.trim()}
                accessibilityLabel="Add to VIP list"
              />
            </View>
          </Card>
        </FadeIn>
      )}

      {error && (
        <ErrorMessage
          message={error}
          action="Retry"
          onAction={handleRefresh}
        />
      )}

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={
          items.length === 0
            ? { flex: 1, justifyContent: 'center', alignItems: 'center' }
            : { paddingBottom: spacing.xl }
        }
        ListEmptyComponent={
          loading ? null : (
            <StatusScreen
              icon="star-off-outline"
              iconColor={colors.textDisabled}
              title="No VIP numbers"
              subtitle="VIP callers get priority access to your AI assistant and bypass filters."
            />
          )
        }
      />

      <ConfirmSheet
        visible={!!removeTarget}
        onDismiss={() => setRemoveTarget(null)}
        title="Remove from VIP?"
        message={`${removeTarget?.display_name || `••${removeTarget?.phone_last4}`} will no longer have VIP priority.`}
        icon="star-off-outline"
        confirmLabel="Remove"
        onConfirm={handleRemove}
      />
    </ScreenWrapper>
  );
}
