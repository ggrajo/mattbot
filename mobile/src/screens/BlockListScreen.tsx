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
import { Divider } from '../components/ui/Divider';
import { StatusScreen } from '../components/ui/StatusScreen';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { ContactPicker } from '../components/ContactPicker';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { useBlockStore } from '../store/blockStore';
import { extractApiError } from '../api/client';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { formatRelative } from '../utils/formatDate';
import type { BlockEntry } from '../api/blocks';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BlockList'>;

export function BlockListScreen({ navigation }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const userTz = useSettingsStore((s) => s.settings?.timezone) || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { items, loading, error, loadBlocks, addBlock, removeBlock } =
    useBlockStore();

  const [phoneE164, setPhoneE164] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [reason, setReason] = useState('');
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [removeTarget, setRemoveTarget] = useState<BlockEntry | null>(null);

  useEffect(() => {
    loadBlocks();
  }, []);

  const handleRefresh = useCallback(() => {
    loadBlocks();
  }, [loadBlocks]);

  async function handleAdd() {
    if (!phoneE164.trim()) {
      setToastType('error');
      setToast('Phone number is required');
      return;
    }
    hapticMedium();
    setAdding(true);
    const ok = await addBlock({
      phone_number: phoneE164.trim(),
      display_name: displayName.trim() || undefined,
      reason: reason.trim() || undefined,
    });
    if (ok) {
      setToastType('success');
      setToast('Number blocked');
      setPhoneE164('');
      setDisplayName('');
      setReason('');
      setShowForm(false);
    } else {
      setToastType('error');
      setToast(useBlockStore.getState().error ?? 'Failed to block');
    }
    setAdding(false);
  }

  async function handleRemove() {
    if (!removeTarget) return;
    hapticMedium();
    const ok = await removeBlock(removeTarget.id);
    if (ok) {
      setToastType('success');
      setToast('Number unblocked');
    } else {
      setToastType('error');
      setToast(useBlockStore.getState().error ?? 'Failed to unblock');
    }
    setRemoveTarget(null);
  }

  function handleContactPick(selected: { phoneNumber: string; displayName?: string }) {
    if (selected.phoneNumber) setPhoneE164(selected.phoneNumber);
    if (selected.displayName) setDisplayName(selected.displayName);
  }

  function renderItem({ item, index }: { item: BlockEntry; index: number }) {
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
              backgroundColor: colors.error + '14',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="shield-off-outline" size="md" color={colors.error} />
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
              {item.reason && (
                <Text
                  style={{
                    ...typography.caption,
                    color: colors.textSecondary,
                    fontStyle: 'italic',
                  }}
                  numberOfLines={1}
                  allowFontScaling
                >
                  · {item.reason}
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
            accessibilityLabel={`Unblock ${item.display_name || item.phone_last4}`}
          >
            <Icon name="close-circle-outline" size="md" color={colors.error} />
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
        <Icon name="shield-off-outline" size="lg" color={colors.error} />
        <Text
          style={{ ...typography.h2, color: colors.textPrimary, flex: 1 }}
          allowFontScaling
        >
          Block List
        </Text>
        {items.length > 0 && (
          <Text
            style={{ ...typography.caption, color: colors.textSecondary }}
            allowFontScaling
          >
            {items.length} blocked
          </Text>
        )}
        <TouchableOpacity
          onPress={() => {
            hapticLight();
            setShowForm(!showForm);
          }}
          activeOpacity={0.7}
          style={{
            width: 40,
            height: 40,
            borderRadius: radii.xl,
            backgroundColor: showForm ? colors.error : colors.error + '18',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityRole="button"
          accessibilityLabel={showForm ? 'Close add form' : 'Add blocked number'}
        >
          <Icon
            name={showForm ? 'close' : 'plus'}
            size="md"
            color={showForm ? colors.onPrimary : colors.error}
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
                label="Reason (optional)"
                value={reason}
                onChangeText={setReason}
                placeholder="e.g. Spam, Harassment"
              />
              <Button
                title={adding ? 'Blocking...' : 'Block Number'}
                icon="shield-off-outline"
                onPress={handleAdd}
                loading={adding}
                disabled={adding || !phoneE164.trim()}
                accessibilityLabel="Block this number"
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
              icon="shield-check-outline"
              iconColor={colors.textDisabled}
              title="No blocked numbers"
              subtitle="Numbers you block will appear here. Blocked callers cannot reach your AI assistant."
            />
          )
        }
      />

      <ConfirmSheet
        visible={!!removeTarget}
        onDismiss={() => setRemoveTarget(null)}
        title="Unblock this number?"
        message={`${removeTarget?.display_name || `••${removeTarget?.phone_last4}`} will be able to reach your assistant again.`}
        icon="shield-outline"
        confirmLabel="Unblock"
        onConfirm={handleRemove}
      />
    </ScreenWrapper>
  );
}
