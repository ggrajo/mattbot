import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput as RNTextInput,
} from 'react-native';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Toast } from '../components/ui/Toast';
import { useTheme } from '../theme/ThemeProvider';
import { useContactsStore } from '../store/contactsStore';
import type { CategoryDefaults } from '../api/contacts';

const TEMPERAMENT_OPTIONS = [
  { value: '', label: 'Global Default' },
  { value: 'professional_polite', label: 'Professional & Polite' },
  { value: 'casual_friendly', label: 'Friendly & Casual' },
  { value: 'short_and_direct', label: 'Short & Direct' },
  { value: 'warm_and_supportive', label: 'Warm & Supportive' },
];

const SWEARING_OPTIONS = [
  { value: '', label: 'Global Default' },
  { value: 'no_swearing', label: 'No Swearing' },
  { value: 'mirror_caller', label: 'Mirror Caller' },
  { value: 'allow', label: 'Allow' },
];

const GREETING_OPTIONS = [
  { value: '', label: 'Global Default' },
  { value: 'standard', label: 'Standard' },
  { value: 'brief', label: 'Brief' },
  { value: 'formal', label: 'Formal' },
];

export function CategoryDefaultsScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const {
    categories,
    categoryDefaults,
    loading,
    error,
    loadCategories,
    loadCategoryDefaults,
    saveCategoryDefaults,
    addCategory,
    removeCategory,
  } = useContactsStore();

  const [localDefaults, setLocalDefaults] = useState<CategoryDefaults>({});
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newSlug, setNewSlug] = useState('');
  const [newLabel, setNewLabel] = useState('');

  useEffect(() => {
    loadCategories();
    loadCategoryDefaults();
  }, []);

  useEffect(() => {
    setLocalDefaults({ ...categoryDefaults });
  }, [categoryDefaults]);

  function getDefault(slug: string, key: string): string {
    return (localDefaults[slug]?.[key] as string) ?? '';
  }

  function setDefault(slug: string, key: string, value: string) {
    setLocalDefaults((prev) => {
      const catObj = { ...(prev[slug] ?? {}) };
      if (value) {
        catObj[key] = value;
      } else {
        delete catObj[key];
      }
      return { ...prev, [slug]: catObj };
    });
  }

  async function handleSave() {
    setSaving(true);
    const ok = await saveCategoryDefaults(localDefaults);
    if (ok) {
      setToastType('success');
      setToast('Category defaults saved');
    } else {
      setToastType('error');
      setToast(useContactsStore.getState().error ?? 'Failed to save');
    }
    setSaving(false);
  }

  async function handleAddCategory() {
    const label = newLabel.trim();
    const slug = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!slug || !label) {
      setToastType('error');
      setToast('Please enter a category name');
      return;
    }
    const ok = await addCategory(slug, label);
    if (ok) {
      setNewSlug('');
      setNewLabel('');
      setShowAddCategory(false);
      setToastType('success');
      setToast(`Category "${label}" created`);
    } else {
      setToastType('error');
      setToast(useContactsStore.getState().error ?? 'Failed to create category');
    }
  }

  function handleDeleteCategory(slug: string, label: string) {
    Alert.alert(
      'Delete Category',
      `Delete "${label}"? Contacts in this category will be moved to "Other".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const ok = await removeCategory(slug);
            if (ok) {
              setToastType('success');
              setToast(`"${label}" deleted`);
            } else {
              setToastType('error');
              setToast('Failed to delete category');
            }
          },
        },
      ],
    );
  }

  function renderPicker(
    slug: string,
    key: string,
    label: string,
    options: { value: string; label: string }[],
  ) {
    const selected = getDefault(slug, key);
    return (
      <View style={{ marginBottom: spacing.md }}>
        <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs }}>
          {label}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {options.map((opt) => {
            const active = selected === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setDefault(slug, key, opt.value)}
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs + 2,
                  borderRadius: radii.full,
                  borderWidth: 1.5,
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary + '14' : 'transparent',
                }}
              >
                <Text style={{ ...typography.caption, color: active ? colors.primary : colors.textSecondary, fontWeight: active ? '600' : '400' }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  if (!categories.length && loading) {
    return (
      <ScreenWrapper scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Toast message={toast} type={toastType} visible={!!toast} onDismiss={() => setToast('')} />

      <Text style={{ ...typography.h2, color: colors.textPrimary, marginBottom: spacing.xs }}>
        Category AI Defaults
      </Text>
      <Text style={{ ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.lg }}>
        Set default AI behavior for each category. Per-contact overrides take priority.
      </Text>

      {error && <ErrorMessage message={error} />}

      {categories.map((cat) => {
        const expanded = expandedSlug === cat.slug;
        const hasDefaults = Object.keys(localDefaults[cat.slug] ?? {}).length > 0;
        return (
          <Card key={cat.slug} variant="elevated" style={{ marginBottom: spacing.md }}>
            <TouchableOpacity
              onPress={() => setExpandedSlug(expanded ? null : cat.slug)}
              activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.primary + '1A',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={cat.is_default ? 'folder-outline' : 'folder-plus-outline'} size="sm" color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.body, color: colors.textPrimary, fontWeight: '600' }}>
                    {cat.label}
                  </Text>
                  {hasDefaults && (
                    <Text style={{ ...typography.caption, color: colors.textSecondary }}>
                      {Object.keys(localDefaults[cat.slug] ?? {}).length} override(s)
                    </Text>
                  )}
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                {!cat.is_default && (
                  <TouchableOpacity onPress={() => handleDeleteCategory(cat.slug, cat.label)}>
                    <Icon name="trash-can-outline" size="sm" color={colors.error} />
                  </TouchableOpacity>
                )}
                <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size="sm" color={colors.textSecondary} />
              </View>
            </TouchableOpacity>

            {expanded && (
              <View style={{ marginTop: spacing.lg }}>
                {renderPicker(cat.slug, 'temperament_preset', 'Temperament', TEMPERAMENT_OPTIONS)}
                {renderPicker(cat.slug, 'greeting_template', 'Greeting Style', GREETING_OPTIONS)}
                {renderPicker(cat.slug, 'swearing_rule', 'Swearing Rule', SWEARING_OPTIONS)}

                <View style={{ marginBottom: spacing.md }}>
                  <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: 4 }}>
                    Max Call Length (seconds)
                  </Text>
                  <RNTextInput
                    value={String(getDefault(cat.slug, 'max_call_length_seconds') || '')}
                    onChangeText={(v) => setDefault(cat.slug, 'max_call_length_seconds', v.replace(/[^0-9]/g, ''))}
                    placeholder="e.g. 180 (leave empty for global default)"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    style={{
                      ...typography.body,
                      color: colors.textPrimary,
                      backgroundColor: colors.surfaceVariant,
                      borderRadius: radii.md,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  />
                </View>

                <View style={{ marginBottom: spacing.md }}>
                  <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: 4 }}>
                    Custom Greeting Instructions
                  </Text>
                  <RNTextInput
                    value={String(getDefault(cat.slug, 'greeting_instructions') || '')}
                    onChangeText={(v) => setDefault(cat.slug, 'greeting_instructions', v)}
                    placeholder="How the AI should greet callers in this category..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={3}
                    style={{
                      ...typography.body,
                      color: colors.textPrimary,
                      backgroundColor: colors.surfaceVariant,
                      borderRadius: radii.md,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderWidth: 1,
                      borderColor: colors.border,
                      minHeight: 70,
                      textAlignVertical: 'top',
                    }}
                  />
                </View>

                <View style={{ marginBottom: spacing.md }}>
                  <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: 4 }}>
                    Custom AI Instructions
                  </Text>
                  <RNTextInput
                    value={String(getDefault(cat.slug, 'custom_instructions') || '')}
                    onChangeText={(v) => setDefault(cat.slug, 'custom_instructions', v)}
                    placeholder="Extra context for contacts in this category..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={3}
                    style={{
                      ...typography.body,
                      color: colors.textPrimary,
                      backgroundColor: colors.surfaceVariant,
                      borderRadius: radii.md,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderWidth: 1,
                      borderColor: colors.border,
                      minHeight: 70,
                      textAlignVertical: 'top',
                    }}
                  />
                </View>
              </View>
            )}
          </Card>
        );
      })}

      {/* Add Custom Category */}
      {showAddCategory ? (
        <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
          <View style={{ gap: spacing.md }}>
            <Text style={{ ...typography.h3, color: colors.textPrimary }}>New Custom Category</Text>
            <View>
              <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: 4 }}>Label</Text>
              <RNTextInput
                value={newLabel}
                onChangeText={setNewLabel}
                placeholder="e.g. Gym Buddies"
                placeholderTextColor={colors.textSecondary}
                style={{
                  ...typography.body,
                  color: colors.textPrimary,
                  backgroundColor: colors.surfaceVariant,
                  borderRadius: radii.md,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              />
            </View>
            <View>
              <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: 4 }}>
                Slug (auto-generated)
              </Text>
              <Text style={{ ...typography.bodySmall, color: colors.textSecondary }}>
                {newLabel.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || '...'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button title="Cancel" variant="outline" onPress={() => { setShowAddCategory(false); setNewLabel(''); setNewSlug(''); }} style={{ flex: 1 }} />
              <Button title="Create" onPress={handleAddCategory} disabled={!newLabel.trim()} style={{ flex: 1 }} />
            </View>
          </View>
        </Card>
      ) : (
        <TouchableOpacity
          onPress={() => setShowAddCategory(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            paddingVertical: spacing.md,
            marginBottom: spacing.lg,
          }}
        >
          <Icon name="plus-circle-outline" size="sm" color={colors.primary} />
          <Text style={{ ...typography.body, color: colors.primary }}>Add Custom Category</Text>
        </TouchableOpacity>
      )}

      <Button
        title={saving ? 'Saving...' : 'Save All Defaults'}
        onPress={handleSave}
        disabled={saving}
        style={{ marginBottom: spacing.xxl }}
      />
    </ScreenWrapper>
  );
}
