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
import { PhoneInput } from '../components/ui/PhoneInput';
import { Toast } from '../components/ui/Toast';
import { ConfirmSheet } from '../components/ui/ConfirmSheet';
import { FadeIn } from '../components/ui/FadeIn';
import { StatusScreen } from '../components/ui/StatusScreen';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { ContactPicker } from '../components/ContactPicker';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { useSpamStore } from '../store/spamStore';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { formatRelative } from '../utils/formatDate';
import type { SpamEntry } from '../api/spam';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'SpamList'>;

function scoreColor(score: number, colors: any): string {
  if (score >= 0.7) return colors.error;
  if (score >= 0.4) return colors.warning ?? '#F59E0B';
  return colors.textSecondary;
}

function scoreLabel(score: number): string {
  if (score >= 0.7) return 'Spam';
  if (score >= 0.4) return 'Likely';
  return 'Low';
}

export function SpamListScreen({ navigation }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const userTz =
    useSettingsStore((s) => s.settings?.timezone) ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { items, loading, error, loadSpam, addSpam, removeSpam } =
    useSpamStore();

  const [phoneE164, setPhoneE164] = useState('');
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [removeTarget, setRemoveTarget] = useState<SpamEntry | null>(null);

  useEffect(() => {
    loadSpam();
  }, []);

  const handleRefresh = useCallback(() => {
    loadSpam();
  }, [loadSpam]);

  async function handleAdd() {
    if (!phoneE164.trim()) {
      setToastType('error');
      setToast('Phone number is required');
      return;
    }
    hapticMedium();
    setAdding(true);
    const ok = await addSpam({ phone_number: phoneE164.trim() });
    if (ok) {
      setToastType('success');
      setToast('Marked as spam');
      setPhoneE164('');
      setShowForm(false);
    } else {
      setToastType('error');
      setToast(useSpamStore.getState().error ?? 'Failed to add');
    }
    setAdding(false);
  }

  async function handleRemove() {
    if (!removeTarget) return;
    hapticMedium();
    const ok = await removeSpam(removeTarget.id);
    if (ok) {
      setToastType('success');
      setToast('Removed from spam list');
    } else {
      setToastType('error');
      setToast(useSpamStore.getState().error ?? 'Failed to remove');
    }
    setRemoveTarget(null);
  }

  function handleContactPick(selected: {
    phoneNumber: string;
    displayName?: string;
  }) {
    if (selected.phoneNumber) setPhoneE164(selected.phoneNumber);
  }

  function renderItem({ item, index }: { item: SpamEntry; index: number }) {
    const sc = scoreColor(item.spam_score, colors);
    const row = (
      <Card variant="elevated" style={{ marginBottom: spacing.sm }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          {/* Score badge */}
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: sc + '18',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="alert-octagon-outline" size="md" color={sc} />
          </View>

          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
              }}
            >
              <Text
                style={{
                  ...typography.body,
                  color: colors.textPrimary,
                  fontWeight: '600',
                }}
                numberOfLines={1}
                allowFontScaling
              >
                ••{item.phone_last4}
              </Text>

              <View
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  borderRadius: 6,
                  backgroundColor: sc + '18',
                }}
              >
                <Text
                  style={{
                    ...typography.caption,
                    color: sc,
                    fontWeight: '700',
                    fontSize: 10,
                  }}
                  allowFontScaling
                >
                  {scoreLabel(item.spam_score)}{' '}
                  {Math.round(item.spam_score * 100)}%
                </Text>
              </View>

              {item.auto_blocked && (
                <View
                  style={{
                    paddingHorizontal: 5,
                    paddingVertical: 1,
                    borderRadius: 6,
                    backgroundColor: colors.error + '18',
                  }}
                >
                  <Text
                    style={{
                      ...typography.caption,
                      color: colors.error,
                      fontWeight: '700',
                      fontSize: 10,
                    }}
                    allowFontScaling
                  >
                    BLOCKED
                  </Text>
                </View>
              )}
            </View>

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
                {item.spam_call_count} flag{item.spam_call_count !== 1 ? 's' : ''}
              </Text>
              <Text
                style={{ ...typography.caption, color: colors.textSecondary }}
                allowFontScaling
              >
                · {item.source}
              </Text>
              <Text
                style={{
                  ...typography.caption,
                  color: colors.textSecondary,
                  marginLeft: 'auto',
                }}
                allowFontScaling
              >
                {formatRelative(item.last_flagged_at, userTz)}
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
            accessibilityLabel={`Remove spam entry ••${item.phone_last4}`}
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
        <Icon name="alert-octagon-outline" size="lg" color={colors.error} />
        <Text
          style={{ ...typography.h2, color: colors.textPrimary, flex: 1 }}
          allowFontScaling
        >
          Spam Callers
        </Text>
        {items.length > 0 && (
          <Text
            style={{ ...typography.caption, color: colors.textSecondary }}
            allowFontScaling
          >
            {items.length} flagged
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
          accessibilityLabel={
            showForm ? 'Close add form' : 'Manually add spam number'
          }
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
              <Button
                title={adding ? 'Adding...' : 'Mark as Spam'}
                icon="alert-octagon-outline"
                onPress={handleAdd}
                loading={adding}
                disabled={adding || !phoneE164.trim()}
                accessibilityLabel="Mark this number as spam"
              />
            </View>
          </Card>
        </FadeIn>
      )}

      {error && (
        <ErrorMessage message={error} action="Retry" onAction={handleRefresh} />
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
              title="No spam callers"
              subtitle="Callers flagged as spam will appear here. You can also manually add numbers."
            />
          )
        }
      />

      <ConfirmSheet
        visible={!!removeTarget}
        onDismiss={() => setRemoveTarget(null)}
        title="Remove from spam list?"
        message={`••${removeTarget?.phone_last4} will no longer be flagged as spam.`}
        icon="alert-octagon-outline"
        confirmLabel="Remove"
        onConfirm={handleRemove}
      />
    </ScreenWrapper>
  );
}
