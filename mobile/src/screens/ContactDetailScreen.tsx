import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { TextInput } from '../components/ui/TextInput';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Toast } from '../components/ui/Toast';
import { Divider } from '../components/ui/Divider';
import { ConfirmSheet } from '../components/ui/ConfirmSheet';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { FadeIn } from '../components/ui/FadeIn';
import { useTheme } from '../theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { useContactsStore } from '../store/contactsStore';
import { getContact } from '../api/contacts';
import { extractApiError } from '../api/client';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { formatRelative } from '../utils/formatDate';
import type { ContactItem, ContactUpdateParams } from '../api/contacts';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ContactDetail'>;

const TEMPERAMENT_OPTIONS = [
  { value: '', label: 'Use Default' },
  { value: 'professional_polite', label: 'Professional & Polite' },
  { value: 'casual_friendly', label: 'Friendly & Casual' },
  { value: 'short_and_direct', label: 'Short & Direct' },
  { value: 'warm_and_supportive', label: 'Warm & Supportive' },
];

const SWEARING_OPTIONS = [
  { value: '', label: 'Use Default' },
  { value: 'no_swearing', label: 'No Swearing' },
  { value: 'mirror_caller', label: 'Mirror Caller' },
  { value: 'allow', label: 'Allow' },
];

const GREETING_OPTIONS = [
  { value: '', label: 'Use Default' },
  { value: 'standard', label: 'Standard' },
  { value: 'brief', label: 'Brief' },
  { value: 'formal', label: 'Formal' },
  { value: 'custom', label: 'Custom' },
];

export function ContactDetailScreen({ navigation, route }: Props) {
  const { contactId } = route.params;
  const { colors, spacing, typography, radii } = useTheme();
  const userTz = useSettingsStore((s) => s.settings?.timezone) || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { categories, updateContact, removeContact, loadCategories } =
    useContactsStore();

  const [contact, setContact] = useState<ContactItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const [displayName, setDisplayName] = useState('');
  const [company, setCompany] = useState('');
  const [relationship, setRelationship] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('other');
  const [isVip, setIsVip] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  const [showAi, setShowAi] = useState(false);
  const [aiTemperament, setAiTemperament] = useState('');
  const [aiGreeting, setAiGreeting] = useState('');
  const [aiSwearing, setAiSwearing] = useState('');
  const [aiMaxCall, setAiMaxCall] = useState('');
  const [aiCustomInstructions, setAiCustomInstructions] = useState('');

  const loadContact = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const c = await getContact(contactId);
      setContact(c);
      setDisplayName(c.display_name ?? '');
      setCompany(c.company ?? '');
      setRelationship(c.relationship ?? '');
      setEmail(c.email ?? '');
      setNotes(c.notes ?? '');
      setCategory(c.category);
      setIsVip(c.is_vip);
      setIsBlocked(c.is_blocked);
      setBlockReason(c.block_reason ?? '');
      setAiTemperament(c.ai_temperament_preset ?? '');
      setAiGreeting(c.ai_greeting_template ?? '');
      setAiSwearing(c.ai_swearing_rule ?? '');
      setAiMaxCall(
        c.ai_max_call_length_seconds
          ? String(c.ai_max_call_length_seconds)
          : '',
      );
    } catch (e: unknown) {
      setError(extractApiError(e));
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    loadContact();
    loadCategories();
  }, [contactId]);

  async function handleSave() {
    hapticMedium();
    setSaving(true);
    const params: ContactUpdateParams = {
      display_name: displayName.trim() || undefined,
      company: company.trim() || undefined,
      relationship: relationship.trim() || undefined,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
      category,
      is_vip: isVip,
      is_blocked: isBlocked,
      block_reason: isBlocked ? blockReason.trim() || undefined : undefined,
      ai_temperament_preset: aiTemperament || undefined,
      ai_greeting_template: aiGreeting || undefined,
      ai_swearing_rule: aiSwearing || undefined,
      ai_max_call_length_seconds:
        aiMaxCall && Number(aiMaxCall) >= 60 ? Number(aiMaxCall) : undefined,
      ai_custom_instructions: aiCustomInstructions.trim() || undefined,
      clear_ai_temperament: !aiTemperament,
      clear_ai_greeting_template: !aiGreeting,
      clear_ai_swearing_rule: !aiSwearing,
      clear_ai_max_call_length: !aiMaxCall,
      clear_ai_custom_instructions: !aiCustomInstructions.trim(),
    };

    const ok = await updateContact(contactId, params);
    if (ok) {
      setToastType('success');
      setToast('Contact updated');
      loadContact();
    } else {
      setToastType('error');
      setToast(useContactsStore.getState().error ?? 'Failed to save');
    }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleteConfirm(false);
    setDeleting(true);
    hapticMedium();
    const ok = await removeContact(contactId);
    if (ok) {
      navigation.goBack();
    } else {
      setToastType('error');
      setToast(useContactsStore.getState().error ?? 'Failed to delete');
      setDeleting(false);
    }
  }

  function renderPicker(
    label: string,
    options: { value: string; label: string }[],
    selected: string,
    onSelect: (v: string) => void,
  ) {
    return (
      <View style={{ marginBottom: spacing.md }}>
        <Text
          style={{
            ...typography.caption,
            color: colors.textSecondary,
            marginBottom: spacing.xs,
          }}
        >
          {label}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.xs,
          }}
        >
          {options.map((opt) => {
            const active = selected === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => {
                  hapticLight();
                  onSelect(opt.value);
                }}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs + 2,
                  borderRadius: radii.full,
                  borderWidth: 1.5,
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active
                    ? colors.primary + '14'
                    : 'transparent',
                }}
              >
                <Text
                  style={{
                    ...typography.caption,
                    color: active ? colors.primary : colors.textSecondary,
                    fontWeight: active ? '600' : '400',
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  if (loading && !contact) {
    return (
      <ScreenWrapper>
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  if (error && !contact) {
    return (
      <ScreenWrapper>
        <ErrorMessage
          message={error}
          action="Retry"
          onAction={loadContact}
        />
      </ScreenWrapper>
    );
  }

  if (!contact) {
    return (
      <ScreenWrapper>
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <Text
            style={{ ...typography.body, color: colors.textSecondary }}
            allowFontScaling
          >
            Contact not found
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Toast
        message={toast}
        type={toastType}
        visible={!!toast}
        onDismiss={() => setToast('')}
      />

      {/* Profile Header */}
      <FadeIn delay={0}>
        <View
          style={{
            alignItems: 'center',
            marginBottom: spacing.xl,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: colors.primary + '18',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.md,
            }}
          >
            <Text
              style={{
                ...typography.h2,
                color: colors.primary,
                fontWeight: '700',
              }}
            >
              {contact.display_name
                ? contact.display_name[0].toUpperCase()
                : '#'}
            </Text>
          </View>
          <Text
            style={{
              ...typography.h2,
              color: colors.textPrimary,
              textAlign: 'center',
            }}
            allowFontScaling
          >
            {contact.display_name || `Unknown ••${contact.phone_last4}`}
          </Text>
          <Text
            style={{
              ...typography.caption,
              color: colors.textSecondary,
              marginTop: spacing.xs,
            }}
            allowFontScaling
          >
            ••{contact.phone_last4} · Added {formatRelative(contact.created_at, userTz)}
          </Text>
        </View>
      </FadeIn>

      {/* Contact Info */}
      <FadeIn delay={60}>
        <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
          <View style={{ gap: spacing.md }}>
            <TextInput
              label="Display Name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="John Smith"
            />
            <TextInput
              label="Company"
              value={company}
              onChangeText={setCompany}
              placeholder="Acme Corp"
            />
            <TextInput
              label="Relationship"
              value={relationship}
              onChangeText={setRelationship}
              placeholder="e.g. Client, Vendor"
            />
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              keyboardType="email-address"
            />
            <TextInput
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional notes..."
              multiline
              numberOfLines={2}
            />

            <Divider />

            {/* Category */}
            <Text
              style={{
                ...typography.caption,
                color: colors.textSecondary,
                marginBottom: spacing.xs,
              }}
            >
              Category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
            >
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                {categories.map((cat) => {
                  const active = category === cat.slug;
                  return (
                    <TouchableOpacity
                      key={cat.slug}
                      onPress={() => {
                        hapticLight();
                        setCategory(cat.slug);
                      }}
                      style={{
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.xs + 2,
                        borderRadius: radii.full,
                        borderWidth: 1.5,
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active
                          ? colors.primary + '14'
                          : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          ...typography.caption,
                          color: active
                            ? colors.primary
                            : colors.textSecondary,
                          fontWeight: active ? '600' : '400',
                        }}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <Divider />

            {/* VIP Toggle */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
              >
                <Icon name="star" size="sm" color="#F59E0B" />
                <Text
                  style={{ ...typography.body, color: colors.textPrimary }}
                >
                  VIP
                </Text>
              </View>
              <Switch
                value={isVip}
                onValueChange={(v) => {
                  hapticLight();
                  setIsVip(v);
                }}
                trackColor={{ true: colors.primary }}
                accessibilityLabel="Toggle VIP status"
              />
            </View>

            {/* Blocked Toggle */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
              >
                <Icon
                  name="shield-off-outline"
                  size="sm"
                  color={colors.error}
                />
                <Text
                  style={{ ...typography.body, color: colors.textPrimary }}
                >
                  Blocked
                </Text>
              </View>
              <Switch
                value={isBlocked}
                onValueChange={(v) => {
                  hapticLight();
                  setIsBlocked(v);
                }}
                trackColor={{ true: colors.error }}
                accessibilityLabel="Toggle blocked status"
              />
            </View>

            {isBlocked && (
              <TextInput
                label="Block Reason"
                value={blockReason}
                onChangeText={setBlockReason}
                placeholder="e.g. Spam, Harassment"
              />
            )}
          </View>
        </Card>
      </FadeIn>

      {/* AI Personalization */}
      <FadeIn delay={120}>
        <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
          <TouchableOpacity
            onPress={() => setShowAi(!showAi)}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
              }}
            >
              <Icon name="robot-outline" size="md" color={colors.accent} />
              <Text
                style={{ ...typography.h3, color: colors.textPrimary }}
              >
                AI Personalization
              </Text>
            </View>
            <Icon
              name={showAi ? 'chevron-up' : 'chevron-down'}
              size="sm"
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {showAi && (
            <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
              <Text
                style={{
                  ...typography.caption,
                  color: colors.textSecondary,
                  marginBottom: spacing.xs,
                }}
              >
                Leave blank to use category defaults
              </Text>
              {renderPicker(
                'Temperament',
                TEMPERAMENT_OPTIONS,
                aiTemperament,
                setAiTemperament,
              )}
              {renderPicker(
                'Greeting Style',
                GREETING_OPTIONS,
                aiGreeting,
                setAiGreeting,
              )}
              {renderPicker(
                'Swearing Rule',
                SWEARING_OPTIONS,
                aiSwearing,
                setAiSwearing,
              )}
              <TextInput
                label="Max Call Length (seconds)"
                value={aiMaxCall}
                onChangeText={setAiMaxCall}
                placeholder="e.g. 180 (leave empty for default)"
                keyboardType="numeric"
              />
              <TextInput
                label="Custom AI Instructions"
                value={aiCustomInstructions}
                onChangeText={setAiCustomInstructions}
                placeholder="Extra context about this contact..."
                multiline
                numberOfLines={3}
              />
            </View>
          )}
        </Card>
      </FadeIn>

      {/* Save + Delete */}
      <FadeIn delay={180}>
        <View style={{ gap: spacing.sm, marginBottom: spacing.xxl }}>
          <Button
            title={saving ? 'Saving...' : 'Save Changes'}
            icon="content-save-outline"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            accessibilityLabel="Save contact changes"
          />
          <Button
            title={deleting ? 'Deleting...' : 'Delete Contact'}
            icon="trash-can-outline"
            onPress={() => setDeleteConfirm(true)}
            variant="ghost"
            loading={deleting}
            disabled={deleting}
            accessibilityLabel="Delete this contact"
          />
        </View>
      </FadeIn>

      <ConfirmSheet
        visible={deleteConfirm}
        onDismiss={() => setDeleteConfirm(false)}
        title="Delete this contact?"
        message="This contact and all personalization will be permanently removed."
        icon="trash-can-outline"
        destructive
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </ScreenWrapper>
  );
}
