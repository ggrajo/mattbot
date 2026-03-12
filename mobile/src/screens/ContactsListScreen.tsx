import React, { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput as RNTextInput,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenWrapper } from '../components/ui/ScreenWrapper';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/ui/Icon';
import { FadeIn } from '../components/ui/FadeIn';
import { StatusScreen } from '../components/ui/StatusScreen';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useTheme } from '../theme/ThemeProvider';
import { useContactsStore } from '../store/contactsStore';
import { hapticLight } from '../utils/haptics';
import { formatRelative } from '../utils/formatDate';
import type { ContactItem } from '../api/contacts';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ContactsList'>;

export function ContactsListScreen({ navigation }: Props) {
  const { colors, spacing, typography, radii } = useTheme();
  const {
    contacts,
    categories,
    loading,
    error,
    loadContacts,
    loadCategories,
  } = useContactsStore();

  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    loadContacts();
    loadCategories();
  }, []);

  useEffect(() => {
    if (contacts.length > 0 && isInitialLoad.current) {
      isInitialLoad.current = false;
    }
  }, [contacts]);

  const handleCategoryChange = useCallback(
    (slug: string) => {
      hapticLight();
      setActiveCategory(slug);
      if (slug === 'all') {
        loadContacts();
      } else {
        loadContacts(slug);
      }
    },
    [loadContacts],
  );

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchText(text);
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(() => {
        // client-side filter — store already loaded
      }, 300);
    },
    [],
  );

  const handleRefresh = useCallback(() => {
    if (activeCategory === 'all') loadContacts();
    else loadContacts(activeCategory);
  }, [activeCategory, loadContacts]);

  const filtered = useMemo(() => {
    if (!searchText.trim()) return contacts;
    const q = searchText.toLowerCase();
    return contacts.filter(
      (c) =>
        (c.display_name && c.display_name.toLowerCase().includes(q)) ||
        c.phone_last4.includes(q) ||
        (c.company && c.company.toLowerCase().includes(q)),
    );
  }, [contacts, searchText]);

  function avatarInitial(c: ContactItem): string {
    if (c.display_name) return c.display_name[0].toUpperCase();
    return '#';
  }

  function displayLabel(c: ContactItem): string {
    if (c.display_name) return c.display_name;
    return `Unknown ••${c.phone_last4}`;
  }

  function renderItem({ item, index }: { item: ContactItem; index: number }) {
    const shouldAnimate = isInitialLoad.current;
    const delay = shouldAnimate ? Math.min(index * 40, 200) : 0;

    const row = (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          hapticLight();
          navigation.navigate('ContactDetail', { contactId: item.id });
        }}
        accessibilityRole="button"
        accessibilityLabel={`Contact ${displayLabel(item)}`}
      >
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
                backgroundColor: colors.primary + '18',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  ...typography.body,
                  color: colors.primary,
                  fontWeight: '700',
                }}
              >
                {avatarInitial(item)}
              </Text>
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
                    flex: 1,
                  }}
                  numberOfLines={1}
                  allowFontScaling
                >
                  {displayLabel(item)}
                </Text>
                {item.is_vip && (
                  <Icon name="star" size="sm" color={colors.warning} />
                )}
                {item.is_blocked && (
                  <Icon name="shield-off-outline" size="sm" color={colors.error} />
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
                <Badge
                  label={
                    categories.find((c) => c.slug === item.category)?.label ??
                    item.category
                  }
                  variant="info"
                />
                {item.company && (
                  <Text
                    style={{
                      ...typography.caption,
                      color: colors.textSecondary,
                    }}
                    numberOfLines={1}
                    allowFontScaling
                  >
                    {item.company}
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
                  ••{item.phone_last4}
                </Text>
              </View>
            </View>

            <Icon name="chevron-right" size="md" color={colors.textDisabled} />
          </View>
        </Card>
      </TouchableOpacity>
    );

    if (shouldAnimate && index < 6) {
      return <FadeIn delay={delay}>{row}</FadeIn>;
    }
    return row;
  }

  return (
    <ScreenWrapper scroll={false} keyboardAvoiding={false}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          marginBottom: spacing.lg,
        }}
      >
        <Icon name="contacts" size="lg" color={colors.primary} />
        <Text
          style={{ ...typography.h2, color: colors.textPrimary, flex: 1 }}
          allowFontScaling
        >
          Contacts
        </Text>
        {filtered.length > 0 && (
          <Text
            style={{ ...typography.caption, color: colors.textSecondary }}
            allowFontScaling
          >
            {filtered.length}
          </Text>
        )}
        <TouchableOpacity
          onPress={() => {
            hapticLight();
            navigation.navigate('AddContact');
          }}
          activeOpacity={0.7}
          style={{
            width: 40,
            height: 40,
            borderRadius: radii.xl,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityRole="button"
          accessibilityLabel="Add contact"
        >
          <Icon name="plus" size="md" color={colors.onPrimary} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: radii.xl,
          paddingHorizontal: spacing.lg,
          gap: spacing.sm,
          minHeight: 48,
          marginBottom: spacing.md,
        }}
      >
        <Icon name="magnify" size="md" color={colors.textDisabled} />
        <RNTextInput
          value={searchText}
          onChangeText={handleSearchChange}
          placeholder="Search contacts..."
          placeholderTextColor={colors.textDisabled}
          style={{
            flex: 1,
            ...typography.body,
            color: colors.textPrimary,
            paddingVertical: spacing.md,
          }}
          returnKeyType="search"
          allowFontScaling
          accessibilityLabel="Search contacts"
        />
        {searchText.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchText('');
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="close-circle" size="sm" color={colors.textDisabled} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category filter chips */}
      <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.xs, alignItems: 'center' }}
        >
          <TouchableOpacity
            onPress={() => handleCategoryChange('all')}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              height: 36,
              paddingHorizontal: spacing.md,
              borderRadius: radii.xl,
              backgroundColor:
                activeCategory === 'all' ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor:
                activeCategory === 'all' ? colors.primary : colors.border,
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: activeCategory === 'all' }}
          >
            <Text
              style={{
                ...typography.caption,
                color:
                  activeCategory === 'all'
                    ? colors.onPrimary
                    : colors.textSecondary,
                fontWeight: '600',
              }}
              allowFontScaling
            >
              All
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => {
            const active = activeCategory === cat.slug;
            return (
              <TouchableOpacity
                key={cat.slug}
                onPress={() => handleCategoryChange(cat.slug)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  height: 36,
                  paddingHorizontal: spacing.md,
                  borderRadius: radii.xl,
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Filter ${cat.label}`}
              >
                <Text
                  style={{
                    ...typography.caption,
                    color: active ? colors.onPrimary : colors.textSecondary,
                    fontWeight: '600',
                  }}
                  allowFontScaling
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {error && (
        <ErrorMessage message={error} action="Retry" onAction={handleRefresh} />
      )}

      <FlatList
        data={filtered}
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
          filtered.length === 0
            ? { flex: 1, justifyContent: 'center', alignItems: 'center' }
            : { paddingBottom: spacing.xl }
        }
        ListEmptyComponent={
          loading ? null : (
            <StatusScreen
              icon="account-off-outline"
              iconColor={colors.textDisabled}
              title="No contacts yet"
              subtitle={
                searchText.trim()
                  ? 'No contacts match your search.'
                  : 'Add your first contact to get started.'
              }
              action={{
                title: 'Add Contact',
                onPress: () => navigation.navigate('AddContact'),
                variant: 'outline',
              }}
            />
          )
        }
      />
    </ScreenWrapper>
  );
}
