import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { apiClient } from '../api/client';

interface CategorySetting {
  category: string;
  settings: { key: string; label: string; value: boolean }[];
}

const CATEGORY_ICONS: Record<string, string> = {
  personal: 'account-outline',
  business: 'briefcase-outline',
  medical: 'hospital-box-outline',
  legal: 'gavel',
  financial: 'currency-usd',
  spam: 'alert-octagon-outline',
  unknown: 'help-circle-outline',
};

const CATEGORY_COLORS: Record<string, string> = {
  personal: '#6366F1',
  business: '#10B981',
  medical: '#EF4444',
  legal: '#F59E0B',
  financial: '#0EA5E9',
  spam: '#EF4444',
  unknown: '#6B7280',
};

export function CategoryDefaultsScreen() {
  const theme = useTheme();
  const { colors, spacing, typography, radii } = theme;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [categories, setCategories] = useState<CategorySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  async function load() {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get('/contacts/categories/defaults');
      const items = res.categories ?? res.items ?? res.data ?? res ?? [];
      const parsed: CategorySetting[] = items.map((item: any) => ({
        category: item.category || item.name,
        settings: Object.entries(item.settings || item.defaults || {}).map(([key, val]) => ({
          key,
          label: key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          value: !!val,
        })),
      }));
      setCategories(parsed);
      setError(undefined);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Failed to load category defaults');
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  async function handleToggle(catIdx: number, settingIdx: number) {
    const updated = [...categories];
    const cat = { ...updated[catIdx] };
    const settings = [...cat.settings];
    settings[settingIdx] = { ...settings[settingIdx], value: !settings[settingIdx].value };
    cat.settings = settings;
    updated[catIdx] = cat;
    setCategories(updated);

    const payload: Record<string, boolean> = {};
    for (const s of settings) {
      payload[s.key] = s.value;
    }

    try {
      await apiClient.put('/contacts/categories/defaults', {
        category: cat.category,
        settings: payload,
      });
    } catch {
      settings[settingIdx] = { ...settings[settingIdx], value: !settings[settingIdx].value };
      cat.settings = settings;
      updated[catIdx] = cat;
      setCategories(updated);
      Alert.alert('Error', 'Failed to save setting');
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <Icon name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={{ ...typography.body, color: colors.error, marginTop: spacing.md, textAlign: 'center' }}>
          {error}
        </Text>
        <Pressable onPress={load} style={{ marginTop: spacing.md }}>
          <Text style={{ ...typography.button, color: colors.primary }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Icon name="arrow-left" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ ...typography.h3, color: colors.textPrimary, marginLeft: spacing.md }}>
          Category Defaults
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 40 }}
      >
        {categories.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
            <Icon name="tag-outline" size={48} color={colors.textSecondary} />
            <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.md }}>
              No categories configured
            </Text>
          </View>
        ) : (
          categories.map((cat, catIdx) => {
            const iconName = CATEGORY_ICONS[cat.category.toLowerCase()] || CATEGORY_ICONS.unknown;
            const catColor = CATEGORY_COLORS[cat.category.toLowerCase()] || CATEGORY_COLORS.unknown;

            return (
              <FadeIn key={cat.category} delay={catIdx * 50}>
                <View
                  style={{
                    backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
                    borderRadius: radii.xl,
                    borderWidth: 1,
                    borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : colors.cardBorder,
                    marginBottom: spacing.lg,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: spacing.md,
                      paddingHorizontal: spacing.lg,
                      borderBottomWidth: cat.settings.length > 0 ? 1 : 0,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: catColor + '18',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name={iconName} size={18} color={catColor} />
                    </View>
                    <Text
                      style={{
                        ...typography.h3,
                        color: colors.textPrimary,
                        marginLeft: spacing.md,
                        textTransform: 'capitalize',
                      }}
                    >
                      {cat.category}
                    </Text>
                  </View>

                  {cat.settings.map((setting, sIdx) => (
                    <View
                      key={setting.key}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: spacing.md,
                        paddingHorizontal: spacing.lg,
                        borderBottomWidth: sIdx < cat.settings.length - 1 ? 1 : 0,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <Text style={{ ...typography.body, color: colors.textPrimary, flex: 1 }}>
                        {setting.label}
                      </Text>
                      <Switch
                        value={setting.value}
                        onValueChange={() => handleToggle(catIdx, sIdx)}
                        trackColor={{ false: colors.border, true: colors.primary + '80' }}
                        thumbColor={setting.value ? colors.primary : colors.textDisabled}
                      />
                    </View>
                  ))}
                </View>
              </FadeIn>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
